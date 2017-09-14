/* jshint node: true */
/* jshint esversion: 6 */
"use strict";

const fs = require('fs-extra');
const JSZip = require('jszip');
const zipper = require("zip-local");
const readline = require('readline');
const colors = require('colors');
const tidy = require('tidy-html5').tidy_html5;

var zip_name, prepend, final_path, job, google_flag = false;

(function () {
	console.log('Hello! This is Zip Script.'.green);

	var rl = readline.createInterface({
	  input: process.stdin,
	  output: process.stdout
	});

	rl.question('Enter zip filename > '.bold, (zip_file) => {
		zip_name = zip_file.trim();

		if (zip_name.indexOf('/') > -1) {
			var filepath_arr = zip_name.split('/');
			filepath_arr.pop();
			final_path = filepath_arr.join('/');
			console.log("Received Filepath: ".gray + zip_name);
			console.log("export.zip will be located within: ".gray + final_path);
		}
		next_prompt(zip_name);
	});

	function next_prompt (zip_file) {
		rl.question('Enter creative name to prepend (i.e., #####OPS_HTML_Desc) > '.bold, (prepend_input) => {
			prepend = prepend_input.trim();
			console.log("Received Prepend: ".gray + prepend);
			inflate_zip(zip_file);
		});
	}
})();

function inflate_zip (zip_filename) {
	// read the zip file
	fs.readFile(zip_filename, function (err, data) {
	    if (err) throw console.error(err.name + ': ' + err.message);
	    JSZip.loadAsync(data).then(function (zip) {
			// if .zip files exist within parent .zip, ABORT
			zip.forEach(function (relativePath, zipEntry) {
				if (zipEntry.name.indexOf('.zip') > -1) {
					console.error('\u2718 ERROR:'.bold.bgRed.white + ' Parent .zip contains child .zip files.'.red);
					console.error('\u2718 Please make sure all children files and directories are uncompressed and try again.'.red);
					process.exit(0);
				}
			});

			// if extract is clean, physically extract zip
			var unzipped = zipper.sync.unzip(zip_filename).save();
	        console.log('\u2713'.green + ' .zip inflate successful');

	        // pass zip object for parsing
	        traverse_zip(zip);
	    });
	});
}

function traverse_zip (master_directory) {
	var html_array = [], all_contents_array = [];

	// parse through zip object for .html files
	master_directory.forEach(function (relativePath, zipEntry) {
		all_contents_array.push(zipEntry);
		if (zipEntry.name.indexOf('.html') > -1 && zipEntry.name.indexOf('__MACOSX') === -1 && zipEntry.name.indexOf('.DS_Store') === -1) {
			html_array.push(zipEntry);
		}
	});

	// TODO: validate to make sure only one .html file is present within each child directory

	// if no .html files exist, ABORT
	if (html_array.length === 0) {
		console.error('\u2718 ERROR:'.bold.bgRed.white + ' No .html files found!'.red);
		console.error('\u2718 Please double-check asset contents and try again.'.red);
		process.exit(0);
	} else {
		console.log('\u2713'.green + ' .html files found successfully');
		validate_html(html_array);
		read_html(html_array, master_directory, all_contents_array);
	}
}

function validate_html (file_array) {
	for (var m = 0; m < file_array.length; m++) {
		var file_name = file_array[m].name;
		console.log('! Validating HTML for: '.bold.blue + file_name);

		var data = fs.readFileSync(file_name, 'utf8');

		if (!goog_check(data)) {
			// lowkey validate html
			var tidy_data = tidy(data, {
				indent: 'auto',
				quiet: true
			});
		}
	}
}

function goog_check (file_name) {
	// if the words "Google Web Designer (some version number)" exist somewhere in the document
	// assume: Google Web Designer (GWD) export file
	var meta_string = new RegExp('"Google Web Designer[^>]*\\d"', 'g');
	var regex_str = file_name.match(meta_string);

	if (regex_str !== null) {
		google_flag = true;
	}
	return google_flag;
}

function read_html (file_array, master_directory, all_contents_array) {
	for (var k = 0; k < file_array.length; k++) {
		var file_name = file_array[k].name;

		// read .html
		var data = fs.readFileSync(file_name, 'utf8');

		var tags = ["var clickTag", "var clickTAG", "var clicktag", "var ATLAS_TAG"],
			inline_tags = ['\"javascript:window.open(window.clickTag)\"', '\"javascript:window.open(window.clickTAG)\"', '\"javascript:window.open(window.clicktag)\"'],
			inline_tags_match = ['\"javascript:window.open\\(window.clickTag\\)\"', '\"javascript:window.open\\(window.clickTAG\\)\"', '\"javascript:window.open\\(window.clicktag\\)\"'],
			api_inject = " = '<mpvc/>https://<mpck/>';",
			isolated_tag = '"<mpvc/>https://<mpck/>"',
			inline_api = '"<mpvc/>https://<mpck/>" target="_blank"',
			injected_data, tag_declaration, match_str, inject_stage, inject_flag = false,
			mplx_stage = '<div id="mplx_stage" style="cursor:pointer;">',
			mplx_script = '<script>mplx={};mplx.mpck="<mpvc/>http://<mpck/>";var clickOut=document.body;clickOut.style.cursor="pointer";clickOut.addEventListener("click",function(){window.open(mplx.mpck);},false);</script>';

		if (goog_check(data)) {
			// injection process for GWD exports
			console.log('!'.bold.red + ' Google Web Designer export: Checking for GWD components...');
			match_str = new RegExp('"http+.*?"', 'g');
			tag_declaration = data.match(match_str);

			if (tag_declaration !== null) {
				for (var tag = 0; tag < tag_declaration.length; tag++) {
					if (tag_declaration[tag].indexOf('www.w3.org') === -1 || tag_declaration[tag].indexOf('Enabler.js') === -1 || tag_declaration[tag].indexOf('googleapis') === -1) {
						injected_data = data.split(tag_declaration[tag]).join(isolated_tag);
					}
					inject_flag = true;
				}
			}
		} else { // else, proceed with normal implementation
			google_flag = false;
			// checking for inline javascript clickTag calls FIRST
			for (var a = 0; a < inline_tags.length; a++) {
				if (data.indexOf(inline_tags[a]) > -1) {
					match_str = new RegExp('(' + inline_tags_match[a] + ')', 'g');
					tag_declaration = data.match(match_str);
					if (tag_declaration !== null) {
						for (var tag = 0; tag < tag_declaration.length; tag++) {
							injected_data = data.split(tag_declaration[tag]).join(inline_api);
						}
						inject_flag = true;
					}
					break;
				} else {
					// otherwise, proceed with original implementation
					for (var j = 0; j < tags.length; j++) {
						// check for clickTag declarations
						if (data.indexOf(tags[j]) > -1) {
							match_str = new RegExp('(' + tags[j] + ' = )(.*);', 'g');
							tag_declaration = data.match(match_str);
							if (tag_declaration !== null) {
								for (var tag = 0; tag < tag_declaration.length; tag++) {
									injected_data = data.split(tag_declaration[tag]).join(tags[j] + api_inject);
								}
								inject_flag = true;
							}
							break;
						} else { // if no clickTags exist, inject API handler right into body
							match_str = new RegExp('(<body)+.*', 'g');
							tag_declaration = data.match(match_str);

							// if <body> tag does not exist, .html file is invalid; ABORT
							if (tag_declaration === null) {
								console.error('\u2718 ERROR:'.bold.bgRed.white + ' .html file is not formatted correctly: '.red + file_name);
								console.error('\u2718 Please manually check file for <body> tags and try again.'.red);
								process.exit(0);
							} else {
								for (var tag = 0; tag < tag_declaration.length; tag++) {
									injected_data = data.split('</body>').join('</body>' + mplx_script);
								}
								inject_flag = true;
							}

							// if any <a> tags exist, comment them out
							if (injected_data.indexOf('<a ') > -1) {
								match_str = new RegExp('(<a )[^>]*>', 'g');
								tag_declaration = injected_data.match(match_str);
								for (var tag = 0; tag < tag_declaration.length; tag++) {
									injected_data = injected_data.split(tag_declaration[tag]).join('<!-- ' + tag_declaration[tag]);
								}
								injected_data = injected_data.split('</a>').join('</a> -->');
							}
						}
					}
				}
			}
		}

		// prep .html file for renaming
		var filename_arr = file_name.split('/');
		filename_arr.pop();

		var final_name_path;
		if (filename_arr.length > 1) {
			final_name_path = filename_arr.join('/');
		} else {
			final_name_path = filename_arr.toString();
		}

		if (inject_flag === true) {
			// files _should_ be clean at this point
			fs.writeFileSync(file_name, injected_data, 'utf8');

			// renaming .html files to index.html for exporting
			fs.renameSync(file_name, final_name_path + '/index.html');
			console.log('\u2713'.green + ' API injection Successful: ' + file_name);
		} else {
			// this REALLY shouldn't ever happen, like, ever
			console.log('! WARNING'.bold.red + ' API injection did not occur; file does not meet requirements. Please manually check the file: '.red + file_name.red);
		}
	}
	create_directories(master_directory, all_contents_array);
}

function create_directories (master_directory, all_contents_array) {
	var final_dir = __dirname + '/export';
	var zip_parent = [], parent_dir = false, splice_length = 0, copy_counter = 0;

	fs.mkdirp(final_dir, function(err) {
		if (err) throw console.error(err.name + ': ' + err.message);

		var parent_check = all_contents_array[0].name;
		var size_format = new RegExp('(\\d{2,}x\\d{2,})', 'g');
		var parent_match = parent_check.match(size_format);

		// checking for whether the .zip has a parent directory that contains all sizes
		// or if the .zip extracts to the size directories directly
		//
		// if parent_match === null, the directory name does not contain a size
		// therefore --> parent directory
		if (parent_match === null) {
			splice_length = 3;
		} else {
			// otherwise, zip extracts to size directories directly
			splice_length = 2;
		}

		master_directory.forEach(function (relativePath, zipEntry) {
			zip_parent.push(zipEntry.name);
			if (zipEntry.dir === true) {
				if (zipEntry.name.indexOf('__MACOSX') === -1 && zipEntry.name.indexOf('.DS_Store') === -1) {
					// RegEx for directories that contain: ##x##
					var size_match = zipEntry.name.match(size_format);
					var dir_splice = zipEntry.name.split('/');

					if (size_match !== null && dir_splice.length <= splice_length) {
						var prepend_dir = final_dir + '/' + prepend + '_' + size_match;

						// copy size directory over to export directory
						fs.copySync(zipEntry.name, prepend_dir);
						copy_counter++;
					}
				}
			}
		});

		// ensures that creative directory names contain adsize
		if (copy_counter === 0) {
			console.error('\u2718 ERROR:'.bold.bgRed.white + ' No children size directories found.'.red);
			console.error('\u2718 Please make sure children directory names contain an adsize in the proper format (##x##) and try again.'.red);
			process.exit(0);
		} else {
			console.log('\u2713'.green + ' Export directory creation successful');
			deflate_zip(zip_parent);
		}
	});
}

function deflate_zip (zip_parent) {
	// these are VERY dependent on file/directory structure
	var directory = __dirname + '/export';
	var final_zip_parent = __dirname + '/' + zip_parent[0];

	var export_path;
	if (final_path === undefined) {
		export_path = 'export.zip';
	} else {
		export_path = final_path + '/export.zip';
	}

	// TODO: ensure that /export directory is empty before deflating
	// fs.emptyDirSync(directory...?);
	zipper.sync.zip(directory).compress().save(export_path);

	// removing physical temp directories
	fs.removeSync(directory);
	fs.removeSync(final_zip_parent);
	// ^^ doesn't work for .zips without a parent folder that carries the sizes:
	// Archive.zip
	// | 160x600/
	// | 300x260/

	console.log('\u2713'.green + ' export.zip deflate successful');
	console.log('Asset prep complete.'.bold.green);
	process.exit(0);
}