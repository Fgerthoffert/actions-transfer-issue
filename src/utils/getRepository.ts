/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const getRepository = async ({
  octokit,
  ownerLogin,
  repoName
}: {
  octokit: any
  ownerLogin: string
  repoName: string
}): Promise<GitHubRepository> => {
  core.debug(
    `Fetching details about a repository ${repoName} in organization ${ownerLogin}`
  )

  const graphQLResponse: any = await octokit
    .graphql(
      `
      query repository($ownerLogin: String!, $repoName: String!) {
        organization(login: $ownerLogin) {
          repository(name: $repoName) {
            id
            name
            isPrivate
            owner {
              login
            }
          }
        }
      }
    `,
      { ownerLogin: ownerLogin, repoName: repoName }
    )
    .catch((error: Error) => {
      core.error(error.message)
    })
  return graphQLResponse?.organization?.repository
}

export default getRepository
