{
	"translatorID": "45d2f496-3613-40d3-9b78-6a1879c581cf",
	"label": "ubtue_sabinetAfricanJournals",
	"creator": "Helena Nebel",
	"target": "journals\\.co\\.za\\/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 97,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-03 12:30:11"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Atypon Journals Translator
	Copyright © 2011-2022 Sebastian Karcher and Abe Jellinek

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.search(/\/toc\//) != -1) {
		return getSearchResults(doc, true) ? "multiple" : false;
	}
	
	
	else if (url.search(/\/doi\/abs\//) != -1) {
		return "journalArticle";
	}

	return false;
}

function getSearchResults(doc, checkOnly, extras) {
	var articles = {}
	var rows = ZU.xpath(doc, '//h5[@class="issue-item__title"]/a[contains(@href, "/doi/abs/")]');
	for (var i = 0; i < rows.length; i++) {
		var title = rows[i].textContent;
		if (!title) continue;
		var url = rows[i].href;
		if (!url) continue;
		if (checkOnly) return true;
		found = true;
		articles[url] = title;
	}
	return found ? articles : false;
}

// Keep this in line with target regexp
var replURLRegExp = /\/doi\/((?:abs|abstract|full|figure|ref|citedby|book)\/)?/;

// Regex matching sites that load PDFs in an embedded reader
const NEED_BYPASS_EMBEDDED_READER = /^https?:\/\/www\.embopress\.org\//;


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		var extras = {};
		Zotero.selectItems(getSearchResults(doc, false, extras), function (items) {
			if (!items) {
				return;
			}
			var articles = [];
			for (var itemurl in items) {
				articles.push({
					url: itemurl.replace(/\?prev.+/, ""),
					extras: extras[itemurl]
				});
			}
			
			fetchArticles(articles);
		});
	}
	else {
		scrape(doc, url, {});
	}
}

function fixCase(str, titleCase) {
	if (str.toUpperCase() != str) return str;
	
	if (titleCase) {
		return ZU.capitalizeTitle(str, true);
	}
	
	return str.charAt(0) + str.substr(1).toLowerCase();
}

function isConference(doc) {
	for (let label of doc.querySelectorAll('.publication-details__list .label')) {
		if (label.innerText.trim() == 'Conference:') {
			return true;
		}
	}
	return false;
}

function fetchArticles(articles) {
	if (!articles.length) return;
	
	var article = articles.shift();
	ZU.processDocuments(article.url, function (doc, url) {
		scrape(doc, url, article.extras);
	},
	function () {
		if (articles.length) fetchArticles(articles);
	});
}

function scrape(doc, url, extras) {
	url = url.replace(/[?#].*/, "");
	var doi = url.match(/10\.[^?#]+/)[0];
	var citationurl = url.replace(replURLRegExp, "/action/showCitFormats?doi=");
	var abstract = doc.getElementsByClassName('abstractSection')[0]
		|| doc.querySelector('#bookExcerpt, #abstract');
	var tags = ZU.xpath(doc, '//a[contains(@href, "keyword") or contains(@href, "Keyword=")]');
	Z.debug("Citation URL: " + citationurl);
	
	function finalize(filename) {
		Z.debug("Filename: " + filename);
		var get = '/action/downloadCitation';
		var post = 'doi=' + doi + '&downloadFileName=' + filename + '&format=ris&direct=true&include=cit';
		ZU.doPost(get, post, function (risText) {
			// Z.debug(risText);
			var translator = Zotero.loadTranslator("import");
			// Calling the RIS translator
			translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
			translator.setString(risText);
			translator.setHandler("itemDone", function (obj, item) {
				// Sometimes we get titles and authors in all caps
				item.title = fixCase(item.title);

				// Some special characters get corrupted in the RIS we get
				if (/\b\?s/.test(item.title) && text(doc, 'h1.citation__title')) {
					item.title = text(doc, 'h1.citation__title');
				}

				if (!item.date) {
					item.date = text(doc, 'span[property="datePublished"]');
				}
				if (item.date) {
					item.date = ZU.strToISO(item.date);
					let parts = item.date.split('-');
					if (parts.length == 3 && parts[2] == '01') {
						item.date = parts[0] + '-' + parts[1];
					}
				}
				
				if (item.journalAbbreviation == item.publicationTitle) {
					delete item.journalAbbreviation;
				}
				
				if (item.itemType == 'journalArticle' && isConference(doc)) {
					item.itemType = 'conferencePaper';
				}
				
				if (doc.querySelector('div.contributors [property="author"] a:first-child')) {
					// the HTML is better, so we'll use that.
					item.creators = [];
					let contributors = doc.querySelector('div.contributors');
					for (let authorLink of contributors.querySelectorAll('[property="author"] a:first-child')) {
						let givenName = text(authorLink, '[property="givenName"]');
						let familyName = text(authorLink, '[property="familyName"]');
						if (!givenName && !familyName) {
							item.creators.push({
								lastName: authorLink.innerText,
								creatorType: 'author',
								fieldMode: 1
							});
						}
						else {
							item.creators.push({
								firstName: givenName,
								lastName: familyName,
								creatorType: 'author'
							});
						}
					}
				}
				else {
					for (let creator of item.creators) {
						if (creator.fieldMode == 1) {
							// add a comma after the last name
							// "Smith Todd G" -> "Smith, Todd G"
							let name = creator.lastName.replace(/(\w+)/, '$1,');
							let cleaned = ZU.cleanAuthor(name, creator.creatorType, true);
							delete creator.fieldMode;
							Object.assign(creator, cleaned);
						}
						
						creator.lastName = fixCase(creator.lastName, true);
						if (creator.firstName) {
							creator.firstName = fixCase(creator.firstName, true);
						}
					}
				}

				item.url = url;
				item.notes = [];
				for (var i in tags) {
					item.tags.push(tags[i].textContent);
				}
				
				if (abstract) {
					// Drop "Abstract" prefix
					// This is not excellent, since some abstracts could
					// conceivably begin with the word "abstract"
					item.abstractNote = abstract.innerText
						.replace(/^[^\w\d]*abstract\s*/i, '');
				}
				
				item.attachments = [];
				
				
				if (item.numberOfVolumes == '0') {
					delete item.numberOfVolumes;
				}
				
				for (let authorTag of ZU.xpath(doc, '//div[contains(@class, "accordion-tabbed") and contains(@class, "loa-accordion")]/div')) {
					if (ZU.xpathText(authorTag, './/a[contains(., "orcid")]')) {
						let orcid = ZU.xpathText(authorTag, './/a[contains(., "orcid")]').replace(/https?:\/\/orcid\.org\//, '');
						let authorName = ZU.xpathText(authorTag, './/a[contains(@class, "author-name")]/@title');
						item.notes.push('orcid:' + orcid + ' | ' + authorName);
					}
				}
				if (ZU.xpathText(doc, '//span[@class="citation__access__type"]') == 'Open Access') item.notes.push('LF:');
				item.complete();
			});
			translator.translate();
		});
	}

	// newer Atypon installs; 2nd one is Science, 3rd one ASM
	if (doc.querySelector('a[href*="#pill-citations"], div.pill__item, section.pill__item div.citation-download')) {
		let filename = attr(doc, 'input[name="downloadFileName"]', 'value');
		finalize(filename);
	}
	else {
		ZU.processDocuments(citationurl, function (citationDoc) {
			let filename = attr(citationDoc, 'input[name="downloadFileName"]', 'value');
			finalize(filename);
		});
	}
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://scholarlypublishingcollective.org/psup/biblical-research/issue/31/4",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://scholarlypublishingcollective.org/psup/biblical-research/article-abstract/31/4/463/293318/From-Widows-to-Windows-Luke-s-Use-of-Repetition?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "From Widows to Windows: Luke’s Use of Repetition and Redundancy in Echoes of 1 Kings 17:8–24",
				"creators": [
					{
						"firstName": "Jeremy D.",
						"lastName": "Otten",
						"creatorType": "author"
					}
				],
				"date": "2021/12/15",
				"DOI": "10.5325/bullbiblrese.31.4.0463",
				"ISSN": "1065-223X",
				"abstractNote": "Abstract. Jesus begins his ministry with appeals to Elijah and the widow, making bold and controversial claims about the true beneficiaries of the kingdom of God (Luke 4:25–26; cf. 1 Kgs 17:8–24). Although commentators recognize subsequent allusions to this episode throughout Luke-Acts, these are generally noted in passing and in isolation from each other. This article draws from recent studies that examine “redundant” narrations in the Lukan narrative, applying the same methodology to the phenomenon of the narrator’s repetitive reappropriation of a given OT episode. In examining repeated appeals to the Zarephath account within the Lukan narrative (Luke 4:26; 7:11–17; Acts 9:32–43; 20:7–12; cf. 1 Kgs 17:17–24), it is argued that these passages, when linked together, create a literary arc that spans almost the entirety of Luke-Acts. Viewed as a whole, this arc highlights the unfolding understanding of the true people of God in Lukan theology.",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "scholarlypublishingcollective.org",
				"pages": "463-477",
				"publicationTitle": "Bulletin for Biblical Research",
				"shortTitle": "From Widows to Windows",
				"url": "https://scholarlypublishingcollective.org/psup/biblical-research/article/31/4/463/293318/From-Widows-to-Windows-Luke-s-Use-of-Repetition",
				"volume": "31",
				"attachments": [],
				"tags": [
					{
						"tag": "\"literary criticism\""
					},
					{
						"tag": "\"narrative redundancy\""
					},
					{
						"tag": "Elijah"
					},
					{
						"tag": "Israel"
					},
					{
						"tag": "Luke-Acts"
					},
					{
						"tag": "remnant"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://scholarlypublishingcollective.org/psup/biblical-research/article-abstract/31/4/533/293303/Douglas-Estes-ed-The-Tree-of-Life-Themes-in?redirectedFrom=fulltext",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Douglas Estes, ed. The Tree of Life. Themes in Biblical Narrative: Jewish and Christian Traditions Series 27.",
				"creators": [
					{
						"firstName": "Larisa",
						"lastName": "Levicheva",
						"creatorType": "author"
					}
				],
				"date": "2021/12/15",
				"DOI": "10.5325/bullbiblrese.31.4.0533",
				"ISSN": "1065-223X",
				"issue": "4",
				"language": "en",
				"libraryCatalog": "scholarlypublishingcollective.org",
				"pages": "533-535",
				"publicationTitle": "Bulletin for Biblical Research",
				"shortTitle": "Douglas Estes, ed. The Tree of Life. Themes in Biblical Narrative",
				"url": "https://scholarlypublishingcollective.org/psup/biblical-research/article/31/4/533/293303/Douglas-Estes-ed-The-Tree-of-Life-Themes-in",
				"volume": "31",
				"attachments": [],
				"tags": [
					{
						"tag": "RezensionstagPica"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
