/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-call */
/* eslint-disable  @typescript-eslint/no-unsafe-return */

import * as core from '@actions/core'
import * as github from '@actions/github'

import {
  getIssue,
  removeLabelFromIssue,
  getRepository,
  transferIssueToRepository,
  createTemporaryRepository,
  makeTemporaryRepositoryPublic,
  deleteTemporaryRepository,
  sleep
} from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputGithubToken = core.getInput('token')
    const inputAllowPrivatePublicTransfer =
      core.getInput('allow_private_public_transfer') === 'true'
    const inputCreateLabelsIfMissing =
      core.getInput('create_labels_if_missing') === 'true'

    const inputGithubIssueId = core.getInput('github_issue_id')
    const githubIssuePayload = github.context.payload.issue

    let githubIssueId: string = inputGithubIssueId
    if (
      githubIssuePayload?.node_id !== undefined &&
      typeof githubIssuePayload.node_id === 'string'
    ) {
      githubIssueId = githubIssuePayload.node_id
    }

    const octokit = github.getOctokit(inputGithubToken)
    const {
      data: { login }
    } = await octokit.rest.users.getAuthenticated()
    core.info(`Successfully authenticated to GitHub as: ${login}`)

    // Even though we are receiving data from the issue event
    // we're still going to rely on an API call to collect data about the issue.
    const githubIssue: GitHubIssue = await getIssue({
      octokit,
      issueId: githubIssueId
    })

    core.debug(`Issue: ${JSON.stringify(githubIssue)}`)
    if (githubIssue.id === undefined) {
      core.setFailed(`Unable to find an issue with ID: ${login}`)
    }

    const inputRouterPrefix: string = core.getInput('router_prefix')

    // In source issue, search for a label matching the router prefix
    const sourceLabel = githubIssue.labels.nodes.find((label: GitHubLabel) =>
      label.name.startsWith(inputRouterPrefix)
    )

    if (sourceLabel === undefined) {
      core.info(`Could not find a transfer label attached to the issue`)
      return
    }
    core.info(`Processing transfer label: ${sourceLabel.name}`)

    // Extract the target repository from the label
    const targetRepositoryName = sourceLabel.name.split(':')[1]
    core.info(
      `Request to transfer the issue to repository: ${targetRepositoryName}`
    )

    if (targetRepositoryName === githubIssue.repository.name) {
      core.info(`This issue is already in repository: ${targetRepositoryName}`)
      core.info(`Removing transfer label and exiting`)
      await removeLabelFromIssue({
        octokit,
        issueId: githubIssueId,
        labelId: sourceLabel.id
      })
      return
    }

    const githubTargetRepository: GitHubRepository = await getRepository({
      octokit,
      ownerLogin: githubIssue.repository.owner.login,
      repoName: targetRepositoryName
    })

    // If repository does not exist, warn and exit
    if (githubTargetRepository === undefined) {
      core.warning(
        `No repository with name: ${targetRepositoryName} could be found in the organization, unable to transfer based on label: ${sourceLabel.name}`
      )
      return
    }

    // Special handling to transfer issues from a private repository to a public one
    let transferredIssueId = ''
    if (
      githubIssue.repository.isPrivate === true &&
      githubTargetRepository.isPrivate === false
    ) {
      if (inputAllowPrivatePublicTransfer === false) {
        core.warning(
          `The action is configured to prevent transferring issues from private to public repositories. Update "allow_private_public_transfer" parameter to allow this transfer.`
        )
        return
      }
      core.info(
        `Request received to transfer the issue out of a private repository and into a public one`
      )
      core.info(`This involves the creation of a temporary private repository`)
      const temporaryRepo: GitHubRepository = await createTemporaryRepository({
        octokit,
        ownerLogin: githubIssue.repository.owner.login
      })

      core.info(`Created temporary repository: ${temporaryRepo.name}`)
      const transferredIssueTempRepo = await transferIssueToRepository({
        octokit,
        issueId: githubIssueId,
        repositoryId: temporaryRepo.node_id,
        createLabelsIfMissing: inputCreateLabelsIfMissing
      })
      core.info(
        `Transferred issue to the temporary repository: ${temporaryRepo.name}, new issue ID is: ${transferredIssueTempRepo.id}`
      )
      const tempRepoStatus = await makeTemporaryRepositoryPublic({
        octokit,
        ownerLogin: githubIssue.repository.owner.login,
        repoName: temporaryRepo.name
      })
      core.info(
        `Visibility status for repository: ${temporaryRepo.name} is now: ${tempRepoStatus.visibility} `
      )

      const transferredIssue = await transferIssueToRepository({
        octokit,
        issueId: transferredIssueTempRepo.id,
        repositoryId: githubTargetRepository.id,
        createLabelsIfMissing: inputCreateLabelsIfMissing
      })
      transferredIssueId = transferredIssue.id
      core.info(
        `Transferred issue to the destination repository: ${githubTargetRepository.name}, new issue ID is: ${transferredIssue.id}`
      )

      await deleteTemporaryRepository({
        octokit,
        ownerLogin: githubIssue.repository.owner.login,
        repoName: temporaryRepo.name
      })
      core.info(`Temporary repository ${temporaryRepo.name} deleted`)
    } else {
      const transferredIssue = await transferIssueToRepository({
        octokit,
        issueId: githubIssueId,
        repositoryId: githubTargetRepository.id,
        createLabelsIfMissing: inputCreateLabelsIfMissing
      })
      transferredIssueId = transferredIssue.id

      core.info(
        `Transferred issue to the destination repository: ${githubTargetRepository.name}, new issue ID is: ${transferredIssue.id}`
      )
    }

    // Finally,; delete the transfer label from the source issue
    // To do so, we need to use the new issue ID to get the list of labels
    // and find the one we just used for the transfer
    core.info(
      `Removing label with id: ${sourceLabel.id} from issue ID ${transferredIssueId}`
    )

    // Sleeping for 2s to allow for the labels to be created
    await sleep(2000)

    const githubIssueMoved: GitHubIssue = await getIssue({
      octokit,
      issueId: transferredIssueId
    })
    core.debug(`Issue once moved: ${JSON.stringify(githubIssueMoved)}`)

    const movedLabel = githubIssueMoved.labels.nodes.find(
      label => label.name === sourceLabel.name
    )
    if (movedLabel === undefined) {
      core.info(
        `Could not find the transfer label attached to the issue once moved`
      )
      return
    }
    await removeLabelFromIssue({
      octokit,
      issueId: githubIssueMoved.id,
      labelId: movedLabel.id
    })

    core.setOutput('issue_id', githubIssueMoved.id)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
