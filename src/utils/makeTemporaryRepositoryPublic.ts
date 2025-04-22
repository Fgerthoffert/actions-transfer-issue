/* eslint-disable  @typescript-eslint/no-unsafe-member-access */
/* eslint-disable  @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-call */

import * as core from '@actions/core'

export const makeTemporaryRepositoryPublic = async ({
  octokit,
  ownerLogin,
  repoName
}: {
  octokit: any
  ownerLogin: string
  repoName: string
}): Promise<GitHubRepository> => {
  core.info(
    `Converting repository ${repoName} in organization ${ownerLogin} to public`
  )

  if (!repoName.includes('tmp-')) {
    core.setFailed('Repository name must include "tmp-"')
  }

  const tempRepoPublic = await octokit.request('PATCH /repos/{org}/{repo}', {
    org: ownerLogin,
    repo: repoName,
    private: false,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  return tempRepoPublic.data
}

export default makeTemporaryRepositoryPublic
