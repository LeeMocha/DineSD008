/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"sd008test/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
