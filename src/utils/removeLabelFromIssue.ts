/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const removeLabelFromIssue = async ({
  octokit,
  issueId,
  labelId
}: {
  octokit: any
  issueId: string
  labelId: string
}): Promise<GitHubIssue> => {
  core.info(`Removing label ID: ${labelId} from issue ID ${issueId}`)

  const graphQLResponse: any = await octokit
    .graphql(
      `
      mutation ($labelsIds: [ID!]! $labelableId: ID!) {
        removeLabelsFromLabelable(input: {labelIds: $labelsIds, labelableId: $labelableId}) {
          clientMutationId
        }
      }
    `,
      { labelsIds: [labelId], labelableId: issueId }
    )
    .catch((error: Error) => {
      core.error(error.message)
    })

  return graphQLResponse.node
}

export default removeLabelFromIssue
