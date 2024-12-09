/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const transferIssueToRepository = async ({
  octokit,
  issueId,
  repositoryId,
  createLabelsIfMissing
}: {
  octokit: any
  issueId: string
  repositoryId: string
  createLabelsIfMissing: boolean
}): Promise<GitHubIssue> => {
  core.debug(`Fetching details about issue with node_id: ${issueId}`)

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

  return graphQLResponse.transferIssue.issue
}

export default transferIssueToRepository
