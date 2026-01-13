# Netivo CLI

Node tool to help managing the projects from command line.

It allows you to:
- Create WordPress Theme project

## Installation
To install just run the command:

```npm install -g @netivo/cli```

## How to use

To run this script you need to run command:

```netivo-cli [operation]```

In place of operation you must provide one of the following actions:
- `create-project` - Action which creates WordPress theme project.
- `add-metabox` - Action which creates MetaBox in the WordPress project
- `add-block` - Action which creates gutenberg block in WordPress project
- `create-dev` - Action which creates development site on server with cPanel
- `global` - Action to set up global variables for the cli

Default action is: `create-project`

Each of actions after run, will ask you questions that will give the script necessary data.  