<?php
/**
 *  Created by Netivo for ${PROJECT_NAME}
 *  Creator: Netivo
 *  Creation date: ${DATE}
 */

namespace ${NAMESPACE}\Admin;

use \Netivo\Core\Admin\Panel as CorePanel;

if ( ! defined( 'ABSPATH' ) ) {
	header( 'HTTP/1.0 404 Forbidden' );
	exit;
}

class Panel extends CorePanel
{
    protected function set_vars()
    {

    }

    protected function init()
    {
    }

    protected function custom_header(){}
}