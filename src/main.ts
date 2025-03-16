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
  sleep,
  getTransferLabel,
  addCommentToIssue
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
    const inputAllowPrivatePublicTransferComment =
      core.getInput('allow_private_public_transfer_comment') === 'true'
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
    const sourceGithubIssue: GitHubIssue = await getIssue({
      octokit,
      issueId: githubIssueId
    })

    core.debug(`Issue: ${JSON.stringify(sourceGithubIssue)}`)
    if (sourceGithubIssue.id === undefined) {
      core.setFailed(`Unable to find an issue with ID: ${login}`)
      return
    }

    const sourceLabel = getTransferLabel(sourceGithubIssue)
    // Extract the target repository from the label
    const targetRepositoryName = sourceLabel.name.split(':')[1]

    if (targetRepositoryName === undefined) {
      core.info(
        `No transfer label found on issue: ${sourceGithubIssue.title}, exiting`
      )
      return
    }
    core.info(
      `Request to transfer the issue to repository: ${targetRepositoryName}`
    )

    if (targetRepositoryName === sourceGithubIssue.repository.name) {
      core.info(`This issue is already in repository: ${targetRepositoryName}`)
      core.info(`Removing transfer label and exiting`)
      await removeLabelFromIssue({
        octokit,
        issueId: sourceGithubIssue.id,
        labelId: sourceLabel.id
      })
      return
    }

    const githubTargetRepository: GitHubRepository = await getRepository({
      octokit,
      ownerLogin: sourceGithubIssue.repository.owner.login,
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
      sourceGithubIssue.repository.isPrivate === true &&
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
        ownerLogin: sourceGithubIssue.repository.owner.login
      })

      core.info(`Created temporary repository: ${temporaryRepo.name}`)
      const transferredIssueTempRepo = await transferIssueToRepository({
        octokit,
        issueId: sourceGithubIssue.id,
        repositoryId: temporaryRepo.node_id,
        createLabelsIfMissing: inputCreateLabelsIfMissing,
        sourceGithubIssue
      })

      core.info(
        `Transferred issue to the temporary repository: ${temporaryRepo.name}, new issue ID is: ${transferredIssueTempRepo.id}`
      )
      const tempRepoStatus = await makeTemporaryRepositoryPublic({
        octokit,
        ownerLogin: sourceGithubIssue.repository.owner.login,
        repoName: temporaryRepo.name
      })
      core.info(
        `Visibility status for repository: ${temporaryRepo.name} is now: ${tempRepoStatus.visibility} `
      )

      const transferredIssue = await transferIssueToRepository({
        octokit,
        issueId: transferredIssueTempRepo.id,
        repositoryId: githubTargetRepository.id,
        createLabelsIfMissing: inputCreateLabelsIfMissing,
        sourceGithubIssue
      })
      transferredIssueId = transferredIssue.id
      core.info(
        `Transferred issue to the destination repository: ${githubTargetRepository.name}, new issue ID is: ${transferredIssue.id}`
      )

      await deleteTemporaryRepository({
        octokit,
        ownerLogin: sourceGithubIssue.repository.owner.login,
        repoName: temporaryRepo.name
      })
      core.info(`Temporary repository ${temporaryRepo.name} deleted`)

      if (inputAllowPrivatePublicTransferComment === true) {
        // Since it might not be desired to expose the name of the private repositories
        // in a public issue, a flag is available to post or not a comment about the transfer
        core.info(
          `Adding comment to issue about the transfer via temporary repository`
        )
        await addCommentToIssue({
          octokit,
          issueId: transferredIssue.id,
          comment:
            'Issue was transferred from a private to a public repository\n\n ' +
            'Source: `' +
            `${sourceGithubIssue.repository.owner.login}/${sourceGithubIssue.repository.name}#${sourceGithubIssue.number}` +
            '`\n' +
            'Destination: `' +
            `${sourceGithubIssue.repository.owner.login}/${githubTargetRepository.name}#${transferredIssue.number}` +
            '`\n' +
            'Temporary repository: `' +
            `${sourceGithubIssue.repository.owner.login}/${temporaryRepo.name}#${transferredIssueTempRepo.number}` +
            ' (deleted)`\n'
        })
      }
    } else {
      const transferredIssue = await transferIssueToRepository({
        octokit,
        issueId: sourceGithubIssue.id,
        repositoryId: githubTargetRepository.id,
        createLabelsIfMissing: inputCreateLabelsIfMissing,
        sourceGithubIssue
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

    const movedLabel = getTransferLabel(githubIssueMoved)
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
