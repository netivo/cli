import { Octokit } from "octokit";

export function create_ropsitory(name, organisation, token) {
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