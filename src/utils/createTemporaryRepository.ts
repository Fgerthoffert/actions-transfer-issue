/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

// From: https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
const salt = (length: number): string => {
  let result = ''
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

const getRepoName = (): string => {
  return `tmp-${new Date()
    .toISOString()
    .replace(/[^a-z0-9+]+/gi, '')
    .toLowerCase()}-${salt(5)}`
}

export const createTemporaryRepository = async ({
  octokit,
  ownerLogin
}: {
  octokit: any
  ownerLogin: string
}): Promise<GitHubRepository> => {
  const repoName = getRepoName()
  core.debug(`Creating repository ${repoName} in organization ${ownerLogin}`)

  const newRepo = await octokit.request('POST /orgs/{org}/repos', {
    org: ownerLogin,
    name: repoName,
    description: 'Temporary repository created to transfer an issue',
    private: true,
    has_issues: true,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  return newRepo.data
}

export default createTemporaryRepository
