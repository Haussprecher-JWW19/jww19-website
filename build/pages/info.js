/** This is the build script for the `/<LANG>/info.html` web page. It renders the content from `src/content/pages/info/` to html and builds the info page at `/en/info.html` and `/de/info.html` using the template at `src/templates/page/info.ejs` and metadata at `src/content/pages/info/meta.json`.

The info page is organized into topics and sections.
**/

const fs = require("fs");
const ejs = require("ejs");
const {
    parseMultilingualMarkdown,
    PUBLIC_DIR,
    PAGES_CONTENT_DIR,
    FRAGMENT_TEMPLATES_DIR,
    PAGE_TEMPLATES_DIR,
    FRAGMENTS_CONTENT_DIR,
    PAGES_STYLES_DIR,
    FRAGMENT_STYLES_DIR,
    GITHUB_EDIT_INFO_ROOT,
    GITHUB_ROOT,
    bundleStyles
} = require("../lib");
const path = require("path");

const INFO_CONTENT_DIR = PAGES_CONTENT_DIR + 'info/';
const MD_EXT = ".md";

/** Builds a html string that consists of the sections in `src/content/page/info/`. The top-level markdown files contain the section description and the directories contain topics in that section. **/
function renderContent(lang) {
    let renderedSections = '';
    for (const file of fs.readdirSync(INFO_CONTENT_DIR)) {
        if (fs.lstatSync(INFO_CONTENT_DIR + file).isFile() && file.endsWith(MD_EXT)) {
            renderedSections += renderContentSection(INFO_CONTENT_DIR + file, lang);
        }
    }
    return renderedSections;
}

/** Render a section using it's filename. Optionally, if a directory exists with the same name as the file (ignoring the extension), the files inside that directory are rendered as topics of the section. **/
function renderContentSection(sectionFile, lang) {
    const content = parseMultilingualMarkdown(sectionFile);
    const sectionTopicsDir = sectionFile.replace(/\.md$/, '');
    const sectionName = path.basename(sectionTopicsDir);
    let renderedSection = `<section id="${sectionName}"><h1>${content[lang].title}</h1><div>${content[lang].renderedBody}</div>`;

    if (fs.existsSync(sectionTopicsDir)) {
        for (const topicFile of fs.readdirSync(sectionTopicsDir)) {
            if (topicFile.endsWith(MD_EXT)) {
                renderedSection += renderTopic(sectionTopicsDir, topicFile, lang);
            }
        }
    }
    renderedSection += '</section>';
    return renderedSection;
}

const topicTemplate = fs.readFileSync(FRAGMENT_TEMPLATES_DIR + 'topic.ejs', 'utf-8');

/** Use the `src/templates/fragments/topic.ejs` template to render the topics for the info page. **/
function renderTopic(parentDir, topicFile, lang) {
    const topic = parseMultilingualMarkdown(parentDir + '/' + topicFile);
    const topicID = topicFile.replace(/\.md$/, '');
    return ejs.render(topicTemplate, {
        topicID: topicID,
        title: topic[lang].title,
        body: topic[lang].renderedBody,
        editLink: GITHUB_EDIT_INFO_ROOT + path.basename(parentDir) + '/' + topicFile,
        editButtonText: metadata[lang].editButtonText
    });
}

/** Renders the index that can be opened with the burger menu for the info page. It uses html fragment links to jump to the appropriate part of the page. **/
function renderPageIndex(lang) {
    let renderedPageIndex = '';
    for (const sectionDir of fs.readdirSync(INFO_CONTENT_DIR)) {
        if (fs.lstatSync(INFO_CONTENT_DIR + '/' + sectionDir).isDirectory() && sectionDir !== 'a-landing') {
            const section = parseMultilingualMarkdown(INFO_CONTENT_DIR + sectionDir + '.md');
            renderedPageIndex += `<h1><a href="#${sectionDir}" class="index-entry">${section[lang].title}</a></h1><ul>`;
            for (const topicFile of fs.readdirSync(INFO_CONTENT_DIR + sectionDir)) {
                const topic = parseMultilingualMarkdown(INFO_CONTENT_DIR + sectionDir + "/" + topicFile);
                const topicID = topicFile.replace(/\.md$/, '');
                renderedPageIndex += `<li><a href="#${topicID}" class="index-entry">${topic[lang].title}</a></li>`;
            }
            renderedPageIndex += '</ul>';
        }
    }
    return renderedPageIndex;
}

// Read and preprocess required data for the EJS template
const metadata = JSON.parse(fs.readFileSync(INFO_CONTENT_DIR + 'meta.json', 'utf-8'));
const metaTagsTemplate = fs.readFileSync(FRAGMENT_TEMPLATES_DIR + 'metaTags.ejs', 'utf-8');
const langToggleTemplate = fs.readFileSync(FRAGMENT_TEMPLATES_DIR + 'lang-toggle.ejs', 'utf-8');
const langToggleData = JSON.parse(fs.readFileSync(FRAGMENTS_CONTENT_DIR + 'lang-toggle/meta.json', 'utf-8'));
const internalCSS = bundleStyles([
    FRAGMENT_STYLES_DIR + 'footer.css',
    FRAGMENT_STYLES_DIR + 'lang-toggle.css',
    FRAGMENT_STYLES_DIR + 'topic.css',
    FRAGMENT_STYLES_DIR + 'content.css',
    PAGES_STYLES_DIR + 'info.css'
]);
const footerTemplate = fs.readFileSync(FRAGMENT_TEMPLATES_DIR + 'footer.ejs', 'utf-8');
const infoTemplate = fs.readFileSync(PAGE_TEMPLATES_DIR + 'info.ejs', 'utf-8');


/** Use the preprocessed data and EJS template to create an info.html for the specified language. **/
function buildInfoPage(lang) {
	// Consolidate all the preprocessed data into a single object that can be used by EJS.
    const pageData = {
        ...metadata[lang],
        metaTags: ejs.render(metaTagsTemplate, {
            ...metadata[lang],
            openGraphImageLink: metadata.openGraphImageLink,
            openGraphType: metadata.openGraphType,
            pageName: metadata.pageName,
            isRoot: false
        }),
        internalCSS: internalCSS,
        langToggle: ejs.render(langToggleTemplate, {
            ...langToggleData[lang],
            pageName: metadata.pageName
        }),
        pageIndex: renderPageIndex(lang),
        content: renderContent(lang),
        footer: ejs.render(footerTemplate, {
            githubLink: GITHUB_ROOT
        })
    };

    fs.writeFileSync(
        PUBLIC_DIR + lang + '/info.html',
        ejs.render(infoTemplate, pageData),
        'utf-8'
    );
}

module.exports = {
    buildInfoPages() {
        buildInfoPage('en');
        buildInfoPage('de');
    }
}
