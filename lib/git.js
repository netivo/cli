import { Octokit } from "octokit";
import * as spawn from "cross-spawn";
import fs from "fs";

export function create_repository(name, organisation, token) {
  return new Promise((resolve, reject) => {
    const octokit = new Octokit({ auth: token });

    octokit.rest.repos.createInOrg({
      org: organisation,
      name: name,
      private: true,
    }).then(response => {
      resolve(response.data);
    }).catch(error => {
      reject(error);
    })
  });
}

export function add_team_to_repo(organisation, team_slug, repo, token) {
  return new Promise((resolve, reject) => {
    const octokit = new Octokit({ auth: token });
    octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
      org: organisation,
      team_slug: team_slug,
      owner: organisation,
      repo: repo,
      permission: 'push',
    }).then(response => {
      resolve(response.data);
    }).catch(error => {
      reject(error);
    });
  });
}

export function download_repository(repository_url, target_dir) {
   spawn.sync('git', ['clone', repository_url, target_dir], {stdio: 'inherit'});
   fs.rmSync(target_dir + '/.git', { recursive: true, force: true });
}