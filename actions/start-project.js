import prompts from 'prompts';
import fs from 'fs';
import path from 'path';
import ospath from 'ospath';
import * as spawn from 'cross-spawn';
import log from '../lib/log.js';
import { download_repository, create_repository, add_team_to_repo } from '../lib/git.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config_file = path.join(ospath.home(), '.netivo');

async function getGlobalConfig() {
    if (fs.existsSync(config_file)) {
        return JSON.parse(fs.readFileSync(config_file, 'utf-8'));
    }
    return {};
}

function saveGlobalConfig(config) {
    fs.writeFileSync(config_file, JSON.stringify(config, null, 2));
}

async function handleNewProject() {
    const createProjectPath = path.join(__dirname, 'create-project.js');
    spawn.sync('node', [createProjectPath], { stdio: 'inherit' });

    // Próba ustalenia nazwy projektu po utworzeniu
    const dirs = fs.readdirSync('.').filter(f => fs.statSync(f).isDirectory());
    for (const dir of dirs) {
        if (fs.existsSync(path.join(dir, 'netivo.json'))) {
            return dir;
        }
    }
    return '';
}

async function handleStarterTheme() {
    const themeResponse = await prompts([
        {
            type: 'text',
            name: 'projectName',
            message: 'Enter project name:',
            validate: value => value.length > 0 ? true : 'Project name cannot be empty'
        }
    ]);

    if (!themeResponse.projectName) return null;
    const projectName = themeResponse.projectName;

    let globalConfig = await getGlobalConfig();

    if (!globalConfig.starter_theme_repo) {
        const repoResponse = await prompts([
            {
                type: 'text',
                name: 'repoUrl',
                message: 'Enter starter theme repository URL:',
                validate: value => value.length > 0 ? true : 'Repository URL cannot be empty'
            }
        ]);

        if (repoResponse.repoUrl) {
            globalConfig.starter_theme_repo = repoResponse.repoUrl;
            saveGlobalConfig(globalConfig);
        } else {
            return null;
        }
    }

    log.log(`Downloading starter theme from ${globalConfig.starter_theme_repo}...`);
    download_repository(globalConfig.starter_theme_repo, projectName);

    const projectDetails = await prompts([
        {
            type: 'text',
            name: 'projectTitle',
            message: 'Enter project title (for netivo.json):',
            validate: value => value.length > 0 ? true : 'Project title cannot be empty'
        },
        {
            type: 'text',
            name: 'namespace',
            message: 'Enter project namespace:',
            validate: value => value.length > 0 ? true : 'Namespace cannot be empty'
        }
    ]);

    if (projectDetails.projectTitle && projectDetails.namespace) {
        log.log('Updating project configuration files...');
        
        // Update package.json
        const packageJsonPath = path.join(projectName, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            packageJson.name = projectName;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }

        // Update netivo.json
        const netivoJsonPath = path.join(projectName, 'netivo.json');
        if (fs.existsSync(netivoJsonPath)) {
            const netivoJson = JSON.parse(fs.readFileSync(netivoJsonPath, 'utf-8'));
            netivoJson.project_name = projectDetails.projectTitle;
            netivoJson.namespace = projectDetails.namespace;
            fs.writeFileSync(netivoJsonPath, JSON.stringify(netivoJson, null, 2));
        }

        // Update composer.json
        const composerJsonPath = path.join(projectName, 'composer.json');
        if (fs.existsSync(composerJsonPath)) {
            const composerJson = JSON.parse(fs.readFileSync(composerJsonPath, 'utf-8'));
            composerJson.name = `netivo/${projectName}`;
            
            if (composerJson.autoload && composerJson.autoload['psr-4']) {
                // Remove old Netivo namespace if exists (it might be different)
                const oldNamespaces = Object.keys(composerJson.autoload['psr-4']).filter(ns => ns.startsWith('Netivo\\'));
                oldNamespaces.forEach(ns => delete composerJson.autoload['psr-4'][ns]);
                
                // Add new namespace
                const fullNamespace = `Netivo\\${projectDetails.namespace}\\Theme\\`;
                composerJson.autoload['psr-4'][fullNamespace] = 'src/Theme';
            }
            
            fs.writeFileSync(composerJsonPath, JSON.stringify(composerJson, null, 2));
        }
    }

    log.log('Initializing git repository...');
    spawn.sync('git', ['init'], { stdio: 'inherit', cwd: projectName });

    return projectName;
}

async function handleGitHubRepo(projectName) {
    if (!projectName) {
        log.log_warning('Cannot create GitHub repository because project name is unknown (new project).');
        return;
    }

    let globalConfig = await getGlobalConfig();

    if (!globalConfig.github_token) {
        const githubResponse = await prompts([
            {
                type: 'text',
                name: 'token',
                message: 'Enter GitHub token:',
                validate: value => value.length > 0 ? true : 'Token cannot be empty'
            },
            {
                type: 'text',
                name: 'org',
                message: 'Enter GitHub organization name:',
                validate: value => value.length > 0 ? true : 'Organization cannot be empty'
            },
            {
                type: 'text',
                name: 'team',
                message: 'Enter team slug (optional):'
            }
        ]);

        if (githubResponse.token && githubResponse.org) {
            globalConfig.github_token = githubResponse.token;
            globalConfig.github_org = githubResponse.org;
            globalConfig.github_team_slug = githubResponse.team;
            saveGlobalConfig(globalConfig);
        } else {
            log.log_error('GitHub data missing, skipping repository creation.');
            return;
        }
    }

    if (globalConfig.github_token && globalConfig.github_org) {
        try {
            log.log('Creating repository on GitHub...');
            const repoData = await create_repository(projectName, globalConfig.github_org, globalConfig.github_token);
            log.log(`Repository created: ${repoData.html_url}`);

            if (globalConfig.github_team_slug) {
                log.log(`Adding team ${globalConfig.github_team_slug} to repository...`);
                await add_team_to_repo(globalConfig.github_org, globalConfig.github_team_slug, projectName, globalConfig.github_token);
            }

            log.log('Configuring remote and first commit...');
            spawn.sync('git', ['remote', 'add', 'origin', repoData.ssh_url], { stdio: 'inherit', cwd: projectName });
            spawn.sync('git', ['add', '.'], { stdio: 'inherit', cwd: projectName });
            spawn.sync('git', ['commit', '-m', 'Initial commit from Netivo CLI'], { stdio: 'inherit', cwd: projectName });
            spawn.sync('git', ['branch', '-M', 'main'], { stdio: 'inherit', cwd: projectName });
            spawn.sync('git', ['push', '-u', 'origin', 'main'], { stdio: 'inherit', cwd: projectName });
            log.log('Done!');
        } catch (err) {
            log.log_error('Error during GitHub operations: ' + err.message);
        }
    }
}

async function handleDevSite(projectName) {
    log.log('Creating development version...');
    const createDevPath = path.join(__dirname, 'create-dev.js');
    let args = [];
    if (projectName) {
        args.push(`--name=${projectName}`);
    }
    spawn.sync('node', [createDevPath, ...args], { stdio: 'inherit' });
}

async function startProject() {
    const response = await prompts([
        {
            type: 'select',
            name: 'projectType',
            message: 'Do you want to create a new project or use a starter theme?',
            choices: [
                { title: 'New project', value: 'new' },
                { title: 'From starter theme', value: 'theme' }
            ]
        }
    ]);

    if (!response.projectType) return;

    let projectName = '';

    if (response.projectType === 'new') {
        projectName = await handleNewProject();
    } else {
        projectName = await handleStarterTheme();
        if (projectName === null) return;
    }

    const finalQuestions = await prompts([
        {
            type: 'confirm',
            name: 'createGithubRepo',
            message: 'Create repository on GitHub?',
            initial: true
        },
        {
            type: 'confirm',
            name: 'createDev',
            message: 'Create development site?',
            initial: true
        }
    ]);

    if (finalQuestions.createGithubRepo) {
        await handleGitHubRepo(projectName);
    }

    if (finalQuestions.createDev) {
        await handleDevSite(projectName);
    }
}

startProject().catch(err => {
    log.log_error(err);
});

