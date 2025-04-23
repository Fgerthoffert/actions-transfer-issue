/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const getIssue = async ({
  octokit,
  issueId
}: {
  octokit: any
  issueId: string
}): Promise<GitHubIssue> => {
  core.info(`Fetching details about issue with node_id: ${issueId}`)

  const graphQLResponse: any = await octokit
    .graphql(
      `
      query issue($issueId: ID!) {
        node(id: $issueId) {
          ... on Issue {
            id
            url
            title
            number
            state
            labels(first: 20) {
              totalCount
              nodes {
                id
                name
              }
            }
            timelineItems(first: 1) {
              totalCount
            }
            projectItems {
              totalCount
            }
            assignees(first: 1) {
              totalCount
            }
            subIssues(first: 1) {
              totalCount
            }
            comments(first: 1) {
              totalCount
            }              
            repository {
              id
              name
              isPrivate
              owner {
                login
              }
            }
          }
        }
      }
    `,
      { issueId: issueId }
    )
    .catch((error: Error) => {
      core.error(error.message)
      throw error
    })

  return graphQLResponse.node
}

export default getIssue
