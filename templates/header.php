<?php
/**
 *  Created by Netivo for ${PROJECT_NAME}
 *  Creator: Netivo
 *  Creation date: ${DATE}
 */

if (!defined('ABSPATH')) {
    header('HTTP/1.0 404 Forbidden');
    exit;
}
?>

<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8"/>
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport"/>

    <title><?php wp_title(); ?></title>
    <?php wp_head() ?>
</head>
<body <?php body_class(); ?>>
<div id="wrapper">
    <div id="content">
