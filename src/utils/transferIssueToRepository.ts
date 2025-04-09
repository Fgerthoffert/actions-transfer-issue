/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'
import { sleep, getIssue, getTransferLabel, removeLabelFromIssue } from './'

const isTransferComplete = (
  sourceIssue: GitHubIssue,
  transferredIssue: GitHubIssue
): boolean => {
  let transferValid = false
  core.debug(`Source: ${JSON.stringify(sourceIssue)}`)
  core.debug(`Transferred: ${JSON.stringify(transferredIssue)}`)
  if (
    sourceIssue.timelineItems === undefined ||
    sourceIssue.timelineItems.totalCount >
      transferredIssue.timelineItems.totalCount
  ) {
    core.debug(
      `Source issue has more timeline items than the transferred issue`
    )
    transferValid = false
  } else if (
    sourceIssue.projectItems === undefined ||
    sourceIssue.projectItems.totalCount >
      transferredIssue.projectItems.totalCount
  ) {
    core.debug(`Source issue has more projectItems than the transferred issue`)
    transferValid = false
  } else if (
    sourceIssue.assignees === undefined ||
    sourceIssue.assignees.totalCount > transferredIssue.assignees.totalCount
  ) {
    core.debug(`Source issue has more assignees than the transferred issue`)
    transferValid = false
  } else if (
    sourceIssue.subIssues === undefined ||
    sourceIssue.subIssues.totalCount > transferredIssue.subIssues.totalCount
  ) {
    core.debug(`Source issue has more subIssues than the transferred issue`)
    transferValid = false
  } else if (
    sourceIssue.comments === undefined ||
    sourceIssue.comments.totalCount > transferredIssue.comments.totalCount
  ) {
    core.debug(`Source issue has more comments than the transferred issue`)
    transferValid = false
  } else {
    core.debug(`All checks successful, issue appears to be fully transferred`)
    transferValid = true
  }
  return transferValid
}

export const transferIssueToRepository = async ({
  octokit,
  issueId,
  repositoryId,
  createLabelsIfMissing,
  sourceGithubIssue
}: {
  octokit: any
  issueId: string
  repositoryId: string
  createLabelsIfMissing: boolean
  sourceGithubIssue: GitHubIssue
}): Promise<GitHubIssue> => {
  core.debug(
    `Will trigger transfer of issue: ${issueId} to repository: ${repositoryId}`
  )

  const graphQLResponse: any = await octokit
    .graphql(
      `
      mutation ($repositoryId: ID! $createLabelsIfMissing: Boolean! $issueId: ID!) {
          transferIssue(input: {
            repositoryId: $repositoryId,
            createLabelsIfMissing: $createLabelsIfMissing,
            issueId: $issueId
          }) {
            issue {
              number
              id
              url
            }
          }
        }
    `,
      {
        issueId: issueId,
        repositoryId: repositoryId,
        createLabelsIfMissing: createLabelsIfMissing
      }
    )
    .catch((error: Error) => {
      core.error(error.message)
    })
  core.debug(
    `Transfer issue response: ${JSON.stringify(graphQLResponse.transferIssue)}`
  )
  const transferredIssue = graphQLResponse.transferIssue.issue
  core.debug(`Issue transferred, the new issue ID is: ${transferredIssue.id}`)
  // Before proceeding, we need to make sure that the issue has been fully transferred
  let issueFound = false
  let issueTriesCpt = 0
  const issueMaxTries = 10
  while (!issueFound) {
    core.debug(
      `Querying issue Id ${graphQLResponse.transferIssue.issue.id} to verify cration - try ${issueTriesCpt}/${issueMaxTries}`
    )
    const checkTransferredIssue: GitHubIssue = await getIssue({
      octokit,
      issueId: transferredIssue.id
    })
    if (checkTransferredIssue !== undefined && checkTransferredIssue !== null) {
      core.debug(`Issue ${transferredIssue.id} was found in the repository`)
      if (isTransferComplete(sourceGithubIssue, checkTransferredIssue)) {
        core.debug(
          `Validated that issue ${transferredIssue.id} was fully transferred`
        )
        issueFound = true
        break
      } else {
        core.debug(
          `Issue ${transferredIssue.id} was transferred but is still missing some data`
        )
      }
    }
    if (issueTriesCpt >= issueMaxTries) {
      core.info(
        `Issue ${transferredIssue.id} Could not be fully transferred to repository ID: ${repositoryId}`
      )
      core.info(
        `The action will now attempt to transfer the issue back to the source repository`
      )

      // Before transferring back we need to remove the transfer label
      // Otherwise the issue will re-initiate the transfer process
      const movedLabel = getTransferLabel(checkTransferredIssue)
      await removeLabelFromIssue({
        octokit,
        issueId: checkTransferredIssue.id,
        labelId: movedLabel.id
      })

      // Transfer the issue back to the source repository
      await transferIssueToRepository({
        octokit: octokit,
        issueId: transferredIssue.id,
        repositoryId: sourceGithubIssue.repository.id,
        createLabelsIfMissing: false,
        sourceGithubIssue: transferredIssue
      })
      core.setFailed(
        `Issue could not be successfully transferred to repository ID: ${repositoryId}. Issue was transferred back to the source repository`
      )
      break
    }
    issueTriesCpt++
    await sleep(1000)
  }
  return transferredIssue
}

export default transferIssueToRepository
