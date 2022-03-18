{
	"translatorID": "7b6ff8ee-d289-4706-a94b-f7c07476df6c",
	"label": "ubtue_ESCJ",
	"creator": "Timotheus Kim",
	"target": "www.escj.org\\/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-18 16:15:10"
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
	else if (url.match(/article/)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(., "Read more")]');
	for (let row of rows) {
		let href = row.href;
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function scrape(doc, url) {
	let i = new Zotero.Item("journalArticle");
	i.title = ZU.xpathText(doc, '//div[@class="breadcrumb_article_title"]');
	for (let author of ZU.xpath(doc, '//div[@class="views-field views-field-field-author"]')) {
		if (author.textContent != null) i.creators.push(ZU.cleanAuthor(author.textContent.trim(), 'author'));
	}
	i.abstractNote = ZU.xpathText(doc, '//div[@class="views-field views-field-body"]');
	i.pages = ZU.xpathText(doc, '//div[@class="views-field views-field-field-start-page"]//span[@class="field-content"]');
	i.url = url;
	for (let tag of ZU.xpath(doc, '//div[@class="pane-content"]/a')) {
		if (tag.href.match(/volume\/(\d+)-\d{4}/) != null) {
			i.volume = tag.href.match(/volume\/(\d+)-(\d{4})/)[1];
			i.date = tag.href.match(/volume\/(\d+)-(\d{4})/)[2];
		}
		else if (tag.href.match(/issue\/\d+-(\d+)/) != null) i.issue = tag.href.match(/issue\/\d+-(\d+)/)[1];
		
	}
	i.ISSN = "0361-0160";
	i.publicationTitle = "The Sixteenth Century Journal";
	i.attachments = [];
	i.complete();
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
			ZU.processDocuments(articles, scrape);
		});
	} else {
		scrape(doc, url);
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
