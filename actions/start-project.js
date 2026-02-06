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

async function updateProjectConfigs(projectName, projectDetails) {
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
            // Add new namespace (don't remove old ones)
            const fullNamespace = `Netivo\\${projectDetails.namespace}\\Theme\\`;
            composerJson.autoload['psr-4'][fullNamespace] = `src/${projectDetails.namespace}`;
        }
        
        fs.writeFileSync(composerJsonPath, JSON.stringify(composerJson, null, 2));
    }

    // Create src/<namespace> folder if not exists
    const srcNamespacePath = path.join(projectName, 'src', projectDetails.namespace);
    if (!fs.existsSync(srcNamespacePath)) {
        fs.mkdirSync(srcNamespacePath, { recursive: true });
    }

    // Update assets.config.php
    const assetsConfigPath = path.join(projectName, 'config', 'assets.config.php');
    if (fs.existsSync(assetsConfigPath)) {
        let assetsConfigContent = fs.readFileSync(assetsConfigPath, 'utf-8');
        
        // Match 'file' => 'something.js' or 'file' => 'something.css'
        // and replace the prefix while preserving any suffixes
        const oldPrefix = 'netivo-woocommerce';
        assetsConfigContent = assetsConfigContent.replace(/(['"]file['"]\s*=>\s*)(['"])([^'"]+)\.(js|css)\2/g, (match, arrow, quote, filePath, ext) => {
            const parts = filePath.split('/');
            const filename = parts.pop();
            const directory = parts.join('/');

            if (filename.startsWith(oldPrefix)) {
                const suffix = filename.substring(oldPrefix.length);
                const newFilename = projectName + suffix;
                const newPath = directory ? `${directory}/${newFilename}.${ext}` : `${newFilename}.${ext}`;
                return `${arrow}${quote}${newPath}${quote}`;
            }

            return match;
        });
        fs.writeFileSync(assetsConfigPath, assetsConfigContent);
    }

    // Update .gitignore
    const gitignorePath = path.join(projectName, '.gitignore');
    const gitignoreRule = `dist/${projectName}*.*`;
    if (fs.existsSync(gitignorePath)) {
        let gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        if (!gitignoreContent.includes(gitignoreRule)) {
            gitignoreContent += `\n${gitignoreRule}\n`;
            fs.writeFileSync(gitignorePath, gitignoreContent);
            log.log(`Added ${gitignoreRule} to .gitignore`);
        }
    } else {
        fs.writeFileSync(gitignorePath, `${gitignoreRule}\n`);
        log.log(`Created .gitignore with ${gitignoreRule}`);
    }
}

function generateEnvFile(projectName) {
    const generateRandomString = (length) => {
        return Math.random().toString(36).substring(2, 2 + length);
    };
    const shuffle = (str) => str.split('').sort(() => 0.5 - Math.random()).join('');

    const envPath = path.join(projectName, '.env');
    const dbName = projectName.substring(0, 3).toLowerCase();

    const dbPrefix = ('w' + shuffle(projectName) + generateRandomString(2)).substring(0, 10);

    const envContent = [
        `PROJECT_NAME=${projectName}`,
        `WORDPRESS_HOST=${projectName}.local.netivo.pl`,
        `DEVELOPMENT_HOST=${projectName}.sm2.netivo.pl`,
        `MYSQL_DB=${dbName}`,
        `MYSQL_USER=${dbName}`,
        `MYSQL_PASSWORD=${dbName}`,
        `MYSQL_ROOT_PASSWORD=${dbName}`,
        `MYSQL_PREFIX=${dbPrefix}_`,
        `LOCAL_UPLOADS_PATH=://\${WORDPRESS_HOST}/wp-content/uploads/`,
        `DEVELOPMENT_UPLOADS_PATH=://\${DEVELOPMENT_HOST}/wp-content/uploads/`
    ].join('\n') + '\n';

    fs.writeFileSync(envPath, envContent);
    log.log('Generated .env file.');
}

async function runStarterThemeInstall(projectName) {
    const installResponse = await prompts([
        {
            type: 'confirm',
            name: 'runInstall',
            message: 'Do you want to run npm install, npm run build and composer install?',
            initial: true
        }
    ]);

    if (installResponse.runInstall) {
        log.log('Running npm install...');
        spawn.sync('npm', ['install'], { stdio: 'inherit', cwd: projectName });

        log.log('Running npm run build...');
        spawn.sync('npm', ['run', 'build'], { stdio: 'inherit', cwd: projectName });

        const composerLockPath = path.join(projectName, 'composer.lock');
        if (fs.existsSync(composerLockPath)) {
            log.log('Removing composer.lock...');
            fs.unlinkSync(composerLockPath);
        }

        log.log('Running composer install...');
        spawn.sync('composer', ['install'], { stdio: 'inherit', cwd: projectName });
    }
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
        await updateProjectConfigs(projectName, projectDetails);
        generateEnvFile(projectName);
        await runStarterThemeInstall(projectName);
        await issueCertificate(projectName + '.local.netivo.pl', projectName);
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

async function issueCertificate(domain, dir) {
    log.log('Generating Let\'s Encrypt certificate...');
    const createDevPath = path.join(__dirname, 'issue-certificate.js');
    let args = [
      '--domain=' + domain,
      '--out=' + dir,
      '--email=michal.swiatek@netivo.pl'
    ];
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

