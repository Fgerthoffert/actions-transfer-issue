/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const addCommentToIssue = async ({
  octokit,
  issueId,
  comment
}: {
  octokit: any
  issueId: string
  comment: string
}): Promise<GitHubIssue> => {
  core.debug(`Adding a comment to issue: ${issueId}`)

  const graphQLResponse: any = await octokit
    .graphql(
      `
      mutation ($issueId: ID! $body: String!) {
          addComment(input: {
            subjectId: $issueId
            body: $body
          }) {
            clientMutationId
          }
        }
    `,
      {
        issueId: issueId,
        body: comment
      }
    )
    .catch((error: Error) => {
      core.error(error.message)
    })

  return graphQLResponse.node
}

export default addCommentToIssue
