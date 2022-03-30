{
	"translatorID": "a467883b-95fe-48b6-a602-5a7b845aa052",
	"label": "ubtue_Persee",
	"creator": "Helena Nebel",
	"target": "www.persee.fr/(doc|issue)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 98,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-30 08:14:32"
}

/*
	***** BEGIN LICENSE BLOCK *****
	Copyright © 2021 Universitätsbibliothek Tübingen.  All rights reserved.
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.match(/\/issue\//) && getSearchResults(doc)) return "multiple";
	else if (url.match(/\/doc\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="issue-document-title"]/a');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function splitDotSeparatedKeywords(item) {
	if (item.ISSN === "2340-0080" && item.tags.length) {
		let split_tags = [];
		for (const tags of item.tags)
			split_tags.push(...tags.split('.'));
		item.tags = split_tags;
	}
	return item.tags;
}


// in some cases (issn == 1799-3121) the article's title is split in 2 parts
function joinTitleAndSubtitle (doc, item) {
	if (item.ISSN == '1799-3121') {
		if (doc.querySelector(".subtitle")) {
			item.title = item.title + ' ' + doc.querySelector(".subtitle").textContent.trim();
		}
	}
	return item.title;
}


function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.pages && i.pages.match(/^\d{1,3}–\d{1,3}-\d{1,3}–\d{1,3}/)) {
			let firstandlastpages = i.pages.split('–');
			i.pages = firstandlastpages[0] + '-' + firstandlastpages[2]; // Z.debug(item.pages)
		}
		
		if (i.issue === "0") delete i.issue;
		if (i.abstractNote && i.abstractNote.match(/No abstract available/)) delete i.abstractNote;
		i.tags = splitDotSeparatedKeywords(i);
		i.title = joinTitleAndSubtitle(doc, i);
		// some journal assigns the volume to the date
		
		i.title = i.title.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
		for (let abstract of ZU.xpath(doc, '//meta[@name="DC.Description"]/@content')) {
			abstract = abstract.textContent.replace(/(<\/?[^>]+>)|(&nbsp;)/g, '');
			if (i.abstractNote != abstract && abstract != "" && abstract != ".") {
				i.notes.push({note: "abs:" + abstract});
			}
		}
		if (ZU.xpathText(doc, '//meta[@name="DC.type"]/@content') != null) {
			if (ZU.xpathText(doc, '//meta[@name="DC.type"]/@content').match(/^(Comptes rendus)|(Vient de paraître)|(Reseñas)|(compterendu)|(rev$)/) != null) {
				i.tags.push("Book Review");
				if (i.title.split('. — ').length == 2) {
					let reviewed_author = i.title.split('. — ')[0];
					let reviewed_titles = i.title.split('. — ')[1];
					if (reviewed_titles != null) {
						for (let reviewed_title of reviewed_titles.split(' ; ')) {
							review_keyword = "#reviewed_pub#title::" + reviewed_title.split(', ')[0];
							if (reviewed_author != null) {
								reviewed_author = reviewed_author.trim().replace(/,/, "").split(" et ")[0];
								splitted_author = ZU.cleanAuthor(reviewed_author, 'author');
								reviewed_author_inverted = splitted_author.lastName + ", " + splitted_author.firstName;
								review_keyword += "#name::" + reviewed_author_inverted;
							}
							if (reviewed_title.split(', ').length > 1) {
								if (reviewed_title.match(/[^\d]\d{4}[^\d]/) != null) {
									let reviewed_year = reviewed_title.match(/[^\d](\d{4})[^\d]/)[1];
									review_keyword += "#year::" + reviewed_year;
								}
							}
							review_keyword += "#";
							review_keyword = ZU.trimInternal(review_keyword.replace(/(?:&nbsp;)/g, " ").replace(/(?:<\/?.+?>)/g, ""));
							i.tags.push(review_keyword);
						}
					}
				}
			}
		}
		i.attachments = [];
		if (i.abstractNote != undefined) {
		if (i.abstractNote.match(/Archivo Teológico Granadino es una revista científica/) != null) {
			i.abstractNote = "";
		}
		}
		if (i.rights == "free") {
			i.notes.push('LF:');
		}
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEMTranslator);
		});
	} else {
		invokeEMTranslator(doc, url);
	}
}





/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/issue/view/70",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "“The message to the people of South Africa” in contemporary context: The question of Palestine and the challenge to the church",
				"creators": [
					{
						"firstName": "Mark",
						"lastName": "Braverman",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.17570/stj.2019.v5n3.a01",
				"ISSN": "2413-9467",
				"abstractNote": "In September 2018 John de Gruchy presented a paper at the Volmoed Colloquium entitled “Revisiting the Message to the people of South Africa,” in which he asks, “what is the significance of the document for our time?” In this expanded version of the author’s response to de Gruchy, two further questions are pursued: First: how can the churches today meet the challenge of today’s global system of economically and politically-driven inequality driven by a constellation of individuals, corporations, and governments? Second: in his review of church history, de Gruchy focused on the issue of church theology described in the 1985 Kairos South Africa document, in which churches use words that purport to support justice but actually serve to shore up the status quo of discrimination, inequality and racism. How does church theology manifest in the contemporary global context, and what is the remedy? The author proposes that ecumenism can serve as a mobilizing and organizing model for church action, and that active engagement in the issue of Palestine is an entry point for church renewal and for a necessary and fruitful exploration of critical issues in theology and ecclesiology.",
				"issue": "3",
				"journalAbbreviation": "STJ",
				"language": "en",
				"libraryCatalog": "ojs.reformedjournals.co.za",
				"pages": "13-40",
				"publicationTitle": "STJ | Stellenbosch Theological Journal",
				"rights": "Copyright (c) 2020 Pieter de Waal Neethling Trust, Stellenbosch",
				"shortTitle": "“The message to the people of South Africa” in contemporary context",
				"url": "https://ojs.reformedjournals.co.za/stj/article/view/1969",
				"volume": "5",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Geleitwort",
				"creators": [
					{
						"firstName": "Christian",
						"lastName": "Oesterheld",
						"creatorType": "author"
					}
				],
				"date": "2018",
				"ISSN": "0254-4407",
				"language": "en",
				"libraryCatalog": "www.zwingliana.ch",
				"pages": "VII-IX",
				"publicationTitle": "Zwingliana",
				"rights": "Authors who are published in this journal agree to the following conditions:  a) The authors retain the copyright and allow the journal to print the first publication in print as well as to make it electronically available at the end of three years.  b) The author may allot distribution of their first version of the article with additional contracts for non-exclusive publications by naming the first publication in this Journal in said publication (i.e. publishing the article in a book or other publications).",
				"url": "http://www.zwingliana.ch/index.php/zwa/article/view/2516",
				"volume": "45",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
