{
	"translatorID": "ce85de7b-0f49-4e7f-83c6-bad720f484e3",
	"label": "ubtue_thlz",
	"creator": "Helena Nebel",
	"target": "www\\.thlz\\.com\\/(artikel\\/|seiten\\/|inhaltsverzeichnisse\\/\\?heft=)",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-03-31 11:35:42"
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
	if (url.match(/\?heft=/) && getSearchResults(doc)) return "multiple";
	else if (url.match(/\/(artikel|seiten)\//)) return "journalArticle";
	else return false;
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//a[contains(@href, "/artikel/") or contains(@href, "/seiten/")]');
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
	let is_bookreview = false;
	if (ZU.xpathText(doc, '//div[@id="inhalt"]//tr').match(/Rezensent(?:in)?:\s/) != null) is_bookreview = true;
	for (let row of ZU.xpath(doc, '//div[@id="inhalt"]//tr')) {
		if (ZU.xpathText(row, './td[1]').match(/^Titel/)) i.title = ZU.xpathText(row, './td[2]');
		if (ZU.xpathText(row, './td[1]').match(/^Rezensent/)) i.creators.push(ZU.cleanAuthor(ZU.xpathText(row, './td[2]'), 'author', true));
		if (!is_bookreview) {
			if (ZU.xpathText(row, './td[1]').match(/^Autor\/Hrsg\./)) i.creators.push(ZU.cleanAuthor(ZU.xpathText(row, './td[2]'), 'author', true));
		}
		if (ZU.xpathText(row, './td[1]').match(/^Spalte/)) i.pages = ZU.xpathText(row, './td[2]');
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) i.date = ZU.xpathText(row, './td[2]').match(/\d{4}/)[0];
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) i.volume = ZU.xpathText(row, './td[2]').match(/\d{4}/)[0];
		if (ZU.xpathText(row, './td[1]').match(/^Ausgabe/)) {
			if (ZU.xpathText(row, './td[2]').match(/^(.+)\//) != null) i.issue = ZU.xpathText(row, './td[2]').match(/^(.+)\//)[1];
			if (ZU.xpathText(row, './td[2]').match(/Nr\.\s+\d+/) != null) i.issue = ZU.xpathText(row, './td[2]').match(/Nr\.\s+(\d+)/)[1];
		}
	}
	if (is_bookreview) {
		let reviewed_title = '';
		let reviewed_author = '';
		let reviewed_information = '';
		let reviewed_year = '';
		let isbn = '';
		for (let row of ZU.xpath(doc, '//div[@id="inhalt"]//tr')) {
			if (ZU.xpathText(row, './td[1]').match(/^Titel/)) reviewed_title = ZU.xpathText(row, './td[2]');
			if (reviewed_title.match(/\d{4}/) != null) reviewed_year = reviewed_title.match(/\d{4}/)[0];
			reviewed_title = reviewed_title.replace(/\d{4}/g, '').trim();
			if (ZU.xpathText(row, './td[1]').match(/^Autor\/Hrsg\./)) reviewed_author = ZU.xpathText(row, './td[2]');
			if (ZU.xpathText(row, './td[1]').match(/^Verlag/)) reviewed_information = ZU.xpathText(row, './td[2]');
			if (reviewed_information.match(/ISBN\s+\d+/) != null) isbn = reviewed_information.match(/ISBN\s+(\d+)/)[1];
			if (reviewed_information.match(/[^\d]\d{4}[^\d]/) != null) reviewed_year = reviewed_information.match(/[^\d](\d{4})[^\d]/)[1];
		}
		i.tags.push("#reviewed_pub#title::" + reviewed_title + "#name::" + reviewed_author + "#year::" + reviewed_year + "#isbn::" + isbn + "#");
		i.tags.push("Book Review");
	}
	
	i.abstractNote = ZU.xpathText(doc, '//div[@class="views-field views-field-body"]');
	i.url = url;
	i.language = "ger";
	i.ISSN = "0040-5671";
	i.publicationTitle = "Theologische Literaturzeitung (ThLZ)";
	i.attachments = [];
	i.complete();
}

function doWeb(doc, url) {
	Z.debug(detectWeb(doc, url));
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
		"url": "http://blog.apastyle.org/apastyle/digital-object-identifier-doi/",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://libguides.csuchico.edu/citingbusiness",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.egms.de/static/de/journals/mbi/2015-15/mbi000336.shtml",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "http://www.roboticsproceedings.org/rss09/p23.html",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://en.wikipedia.org/wiki/Template_talk:Doi",
		"items": "multiple"
	}
]
/** END TEST CASES **/
