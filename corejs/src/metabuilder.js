/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define([ "assert", "core2", "util", "config" ], function (ASSERT, Core, UTIL, CONFIG) {
	"use strict";

	var comparePaths = function (a, b) {
		ASSERT(a.constructor === Array);
		ASSERT(b.constructor === Array);

		var c = a.length;
		var d = b.length;

		while( --c >= 0 && --d >= 0 ) {
			var t = a[c] - b[d];
			if( t !== 0 ) {
				return t;
			}
		}

		return a.length - b.length;
	};

	var builder = function (storage, key, callback) {
		var core = new Core(storage);

		var metaroot = core.createNode();
		var paradigm = core.createNode(metaroot);

		var copyAttributes = function (xmlNode, metaNode, attrs) {
			ASSERT(xmlNode, metaNode, attrs);

			for( var key in attrs ) {
				var value = core.getAttribute(xmlNode, key);
				if( value ) {
					core.setAttribute(metaNode, attrs[key], value);
				}
			}
		};

		var getXmlNodeByName = function (node, name, callback2) {
			ASSERT(node && name);

			core.loadChildren(node, function (err, children) {
				if( err ) {
					callback2(err);
				}
				else {
					for( var i = 0; i < children.length; ++i ) {
						if( core.getAttribute(children[i], "name") === name ) {
							callback2(null, children[i]);
							return;
						}
					}

					node = core.getParent(node);
					if( node ) {
						getXmlNodeByName(node, name, callback2);
					}
					else {
						callback2(null, null);
					}
				}
			});
		};

		var copyChildTexts = function (xmlNode, metaNode, attrs, callback2) {
			ASSERT(xmlNode && metaNode && attrs && callback2);

			var pending = 1;

			var done = function (err) {
				if( callback2 && (err || --pending === 0) ) {
					callback2(err);
					callback2 = null;
				}
			};

			var load = function (tagName, attrName) {
				ASSERT(typeof tagName === "string");
				ASSERT(typeof attrName === "string");

				++pending;
				getXmlChildByTag(xmlNode, tagName, function (err, node) {
					if( !err && node ) {
						var text = core.getAttribute(node, "text") || "";
						core.setAttribute(metaNode, attrName, text);
					}
					done(err);
				});
			};

			for( var tagname in attrs ) {
				load(tagname, attrs[tagname]);
			}

			done(null);
		};

		var getXmlChildByTag = function (node, name, callback2) {
			core.loadChildren(node, function (err, children) {
				if( err ) {
					callback2(err);
				}
				else {
					for( var i = 0; i < children.length; ++i ) {
						if( core.getAttribute(children[i], "#tag") === name ) {
							callback2(null, children[i]);
							return;
						}
					}
					callback2(null, null);
				}
			});
		};

		var alreadyParsed = {};

		var executeParser = function (path, parser, node, callback2) {
			ASSERT(alreadyParsed[path] === undefined);

			alreadyParsed[path] = {
				parsing: true,
				callbacks: [ callback2 ]
			};

			parser(node, function (err, meta) {
				ASSERT(alreadyParsed[path].parsing);

				var callbacks = alreadyParsed[path].callbacks;
				ASSERT(callbacks.length >= 1);

				if( err ) {
					delete alreadyParsed[path];
				}
				else {
					alreadyParsed[path] = meta;
				}

				for( var i = 0; i < callbacks.length; ++i ) {
					callbacks[i](err, meta);
				}
			});
		};

		var parsers = {};

		var parseXmlNode = function (node, callback2) {
			ASSERT(node && callback2);

			var path = core.getStringPath(node);
			var meta = alreadyParsed[path];
			if( meta ) {
				if( meta.parsing && meta.callbacks ) {
					meta.callbacks.push(callback2);
				}
				else {
					callback2(null, meta);
				}
			}
			else {
				var tag = core.getAttribute(node, "#tag");
				if( parsers[tag] ) {
					executeParser(path, parsers[tag], node, callback2);
				}
				else {
					callback2(null, null);
				}
			}
		};

		parsers.paradigm = function (xmlNode, callback2) {
			var metaNode = paradigm;

			copyAttributes(xmlNode, metaNode, {
				name: "name",
				guid: "guid",
				version: "version",
				cdate: "created",
				mdate: "modified",
				"#tag": "#tag"
			});

			copyChildTexts(xmlNode, metaNode, {
				comment: "comment",
				author: "author",
				dispname: "dispname"
			}, function (err) {
				callback2(err, err ? undefined : metaNode);
			});
		};

		parsers.attrdef = function (xmlNode, callback2) {
			var metaNode = core.createNode(paradigm);

			copyAttributes(xmlNode, metaNode, {
				metaref: "metaref",
				name: "name",
				viewable: "viewable",
				defvalue: "defvalue",
				valuetype: "valuetype",
				"#tag": "#tag"
			});

			callback2(null, metaNode);
		};

		var getParsedNodeByName = function (xmlNode, name, callback2) {
			ASSERT(xmlNode && name && callback2);

			getXmlNodeByName(xmlNode, name, function (err, node) {
				if( err ) {
					callback2(err);
				}
				else if( !node ) {
					console.log("Warning: could not resolve \"" + name + "\" element");
					callback2(null, null);
				}
				else {
					parseXmlNode(node, callback2);
				}
			});
		};

		var parseAttributes = function (xmlNode, metaNode, callback2) {
			ASSERT(xmlNode && metaNode && callback2);

			var pending = 1;

			var done = function (err) {
				if( callback2 && (err || --pending === 0) ) {
					callback2(err);
					callback2 = null;
				}
			};

			var create = function (attrName) {
				getParsedNodeByName(xmlNode, attrName, function (err, node) {
					if( !err && node ) {
						var attrNode = core.createNode(metaNode);
						core.setAttribute(attrNode, "name", core.getAttribute(node, "name"));
						// TODO: fix handling of errors
						core.setPointer(attrNode, "basetype", node, function (err2) {
						});
					}
					done(err);
				});
			};

			var attributes = core.getAttribute(xmlNode, "attributes");
			if( attributes ) {
				ASSERT(typeof attributes === "string");

				attributes = attributes.split(" ");
				for( var i = 0; i < attributes.length; ++i ) {
					var attr = attributes[i].trim();
					if( attr !== "" ) {
						create(attr);
					}
				}
			}

			done(null);
		};

		parsers.model = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);

			var metaNode = core.createNode(paradigm);

			copyAttributes(xmlNode, metaNode, {
				metaref: "metaref",
				name: "name",
				"#tag": "#tag"
			});

			var pending = 2;
			var finish = function (err) {
				if( callback2 && (err || --pending === 0) ) {
					callback2(err, err ? null : metaNode);
					callback2 = null;
				}
			};

			copyChildTexts(xmlNode, metaNode, {
				dispname: "dispname"
			}, finish);

			parseAttributes(xmlNode, metaNode, finish);
		};

		parsers.atom = parsers.model;
		parsers.reference = parsers.model;
		parsers.set = parsers.model;
		parsers.connection = parsers.model;

		parsers.regnode = function (xmlNode, callback2) {
			ASSERT(xmlNode && callback2);

			var name = core.getAttribute(xmlNode, "name");
			ASSERT(typeof name === "string");

			var value = core.getAttribute(xmlNode, "value");

			if( value ) {
				xmlNode = core.getParent(xmlNode);
				while( xmlNode !== null && core.getAttribute(xmlNode, "#tag") === "regnode" ) {
					name = core.getAttribute(xmlNode, "name") + "." + name;
					xmlNode = core.getParent(xmlNode);
				}

				parseXmlNode(xmlNode, function (err, metaNode) {
					if( !err && metaNode ) {
						core.setRegistry(metaNode, name, value);
					}
					callback2(err, null);
				});
			}
			else {
				callback2(null, null);
			}
		};

		var enqueue = UTIL.priorityEnqueue(CONFIG.reader.concurrentReads, comparePaths, function (
		err) {
			if( err ) {
				console.log("Building error: " + JSON.stringify(err));
				callback(err);
			}
			else {
				console.log("Building done");
				core.persist(metaroot, function (err2) {
					console.log("Saving meta " + (err2 ? " error:" + err2 : "done"));
					core.dumpTree(core.getKey(metaroot), function (err3) {
						callback(err2);
					});
				});
			}
		});

		var process = function (path, done, node) {
			var errorHandler = UTIL.errorHandler(done);

			var tag = core.getAttribute(node, "#tag");

			if( core.getLevel(node) === 1 && tag !== "paradigm" ) {
				errorHandler.done("Not a meta paradigm");
				return;
			}

			errorHandler.wait();
			core.loadChildren(node, errorHandler.wrap(function (children) {
				for( var i = 0; i < children.length; ++i ) {
					var child = children[i];
					enqueue(core.getPath(child), process, child);
				}
			}));

			errorHandler.wait();
			parseXmlNode(node, errorHandler.done);

			errorHandler.done(null);
		};

		core.loadRoot(key, function (err, node) {
			if( err ) {
				callback(err);
			}
			else {
				console.log("Building meta objects ...");
				enqueue(core.getPath(node), process, node);
			}
		});
	};

	return builder;
});
