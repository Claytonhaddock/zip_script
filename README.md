# HTML5 Zip Script
3rd party HTML5 asset prepper for Mojo/Mediaplex hosting.

----
## Asset Specifications
.zip assets must follow the following structural guidelines in order for the script to function successfully:

### Parent Directory
* .zip file name must **not** contain any spaces

### Children Directories
* Any children directories must remain **uncompressed**
* Children directory names must contain an adsize in one of the following formats: `##x##` / `##x###` / `###x##` / `###x###`
* The main HTML file must be found within the **root** level of each child directory ~~and named index.html~~ **NEW!** now accepts any .html file (script will rename the file to `index.html`).

The files must also follow the [MPLX Developer Specs](http://wiki.cnvrmedia.net/pages/viewpage.action?pageId=78776120#HTML5Hosting-CREATIVESPECSFORDEVELOPERS).

----
## Use
1. Clone this repository.
2. Open Terminal, navigate to the project directory, and enter the following: `npm install`
3. Once the script dependencies have finished download, the script is ready for use. Enter `node zip-script` to initialize the script and follow the instructions.
   * `Enter zip filename >` will accept both a **full path** to the file (feel free to drag and drop the file into your terminal) or a **filename** if the file is located within the same directory as the script.
   * `Enter creative name to prepend (i.e., #####OPS_HTML_Desc) >` as stated, enter the naming convention that will replace the directory names for each unit. This will be the creative name once uploaded into Mojo.
4. There will be a visual indicator when the script finishes successfully. An `export.zip` file will be found within the same directory as the source .zip file.
5. Upload `export.zip` into Mojo using the [Bulk Uploading Multiple Creatives](http://wiki.cnvrmedia.net/pages/viewpage.action?pageId=70028927) instructions, regardless of how many units are uploaded.

----
## Troubleshooting
If the above steps are followed and the assets are within spec, the script should run successfully. Otherwise, it should present you with errors outlining the issue. Here are most of the errors that could happen. If the script hangs or presents an unknown error, reach out.

    Error: ENOENT: no such file or directory

* Make sure .zip file is in the right location.
* Make sure the .zip filename does not contain any spaces.


    ERROR: Parent .zip contains child .zip files.

* All children files within the .zip must be **uncompressed**.


    ERROR: No .html files found!

* The .html file must be within the root level of each child directory.


    ERROR: .html file is not formatted correctly: [filename]

* The file either:
   * Does not contain a `clickTag` per MPLX specs.
   * Does not contain a `<body>` tag of any kind


    ERROR: No children size directories found.

* The children directories must contain an adsize within their names.