/**
 * Czy utworzyć z motywu startowego? tak - git clone, nie - create-project
 * Czy zainicjować git? - tworzenie repo w git
 * Czy utworzyć stronę deweloperską? - tworzenie strony deweloperskiej
 *
 */

import { add_team_to_repo, create_ropsitory } from "../lib/git.js";
import log from "./../lib/log.js";

create_ropsitory("test-octokit5", "netivo", "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").then(data => {
  log.log('Repository created successfully: ' + data.html_url);

  add_team_to_repo("netivo", "developers", data.name, "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").then(() => {
    log.log("Team developers added to repository successfully");
  })
}).catch(err => {
  log.log_error(err);
})

