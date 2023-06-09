{
	"translatorID": "1b06acb7-1f24-47d2-831e-e6f05002dd45",
	"label": "ubtue_BSW",
	"creator": "Helena Nebel",
	"target": "www.bsw.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-09-29 10:54:25"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen.  All rights reserved.
	
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

var articleData = {};
var date = "";
var volume = "";
var issue = "";
var pagesData = {};
var pagesList = [];

function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	if (doc.URL.match(/\/vol-\d+-\d{4}\/v\d+-\d+\//) != null) {
		date = doc.URL.match(/\/vol-\d+-(\d{4})\/v\d+-\d+\//)[1];
		volume = doc.URL.match(/\/vol-(\d+)-\d{4}\/v\d+-\d+\//)[1];
		issue = doc.URL.match(/\/vol-\d+-\d{4}\/v\d+-(\d+)\//)[1];
	}
	else if (doc.URL.match(/filologia-neotestamentaria/) != null && doc.URL.match(/\/vol-\d+-\d{4}\//) != null) {
		date = doc.URL.match(/\/vol-\d+-(\d{4})\//)[1];
		volume = doc.URL.match(/\/vol-(\d+)-\d{4}\//)[1];
	}
	var rows = ZU.xpath(doc, '//div[@class="articoliFasc"]');
	for (let row of rows) {
		let href = "https://www.bsw.org/" + ZU.xpathText(row, './/a[@class="articoliFascTitle"]/@href');
		let title = ZU.xpathText(row, './/a[@class="articoliFascTitle"]');
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		articleData[href] = row;
	}
	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (!items) {
				return true;
			}
			for (var i in items) {
				scrape(doc, articleData[i]);
			}
		});
	} else {
		scrape(doc, url);
	}
}

function scrape(doc, text) {
	var item = new Zotero.Item('journalArticle');
	item.title = ZU.xpathText(text, './/a[@class="articoliFascTitle"]');
	item.url = "https://www.bsw.org" + ZU.xpathText(text, './/a[@class="articoliFascTitle"]/@href');
	item.abstractNote = ZU.xpathText(text, './/p').replace(/\s*\n\s*/g, " ");
	ZU.doGet(item.url,
		function (newItem) {
		var parser = new DOMParser();
		var html = parser.parseFromString(newItem, "text/html");
		var author = ZU.xpathText(html, '//title').split(', ')[0]
		for (let authorName of author.split(/\s+[-]\s+/)) {
		item.creators.push(ZU.cleanAuthor(authorName, 'author', false));
		}
		item.volume = volume;
		item.issue = issue;
		item.date = date;
		//if (text.textContent.match(/\d{4}\s+(\d+-\d+)$/) == null) Z.debug(text.textContent)
		if (text.textContent.match(/\)\s*(\d+-\d+)\s*/) != null) {
		item.pages = text.textContent.match(/\)\s*(\d+-\d+)\s*/)[1];
		}
		else if (text.textContent.match(/Vol\.?\s+(\d+-\d+)/i) != null) {
		item.pages = text.textContent.match(/Vol\.?\s+(\d+-\d+)/i)[1];
		}
		item.notes.push('LF:');
		if (item.url.match(/\/biblica\//) != null) item.ISSN = "0006-0887";
		for (let tag of ZU.xpath(text, './/span[@class="tag-chain-item-span"]')) {
			item.tags.push(tag.textContent);
		}
		item.complete();
	})
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.bsw.org/biblica/vol-97-2016/v1-1/",
		"items": "multiple"
	}
]
/** END TEST CASES **/
