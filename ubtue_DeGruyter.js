{
	"translatorID": "9ef1752e-bd32-49bb-9d9b-f06c039712ab",
	"label": "ubtue_DeGruyter",
	"creator": "Timotheus Kim",
	"target": "^https?:\\/\\/www\\.degruyter\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 80,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-08-24 16:17:57"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2020 Universitätsbibliothek Tübingen.  All rights reserved.

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

var reviewURLs = [];

function detectWeb(doc, url) {
	if (url.includes('/article/')) return "journalArticle";
	else if (url.match(/(issue)|(journal)/) && getSearchResults(doc)) return "multiple";
	else return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//div[@class="resultTitle"]//a[contains(@class, "issueContentsArticleLink")]');
	for (let row of rows) {
		let href = row.href.match(/document/);
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href.input] = title;
	}
	let reviewSection = ZU.xpath(doc, '//div[contains(@class, "issueSubjectGroup")][./h3[@class="issueSubjectGroupHeading"]="II. ABTEILUNG"]');
	var reviewRows = ZU.xpath(reviewSection, './/div[@class="issueArticle"]//a[contains(@class, "issueContentsArticleLink")]');
	for (let row of reviewRows) {
		let href = row.href.match(/document/).input;
		reviewURLs.push(href);
	}
	return found ? items : false;
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

function invokeEMTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (i.title.match(/ISBN/)) i.tags.push('Book Review') && delete i.abstractNote;
		if (i.abstractNote) {
			i.abstractNote += ZU.xpathText(doc, '//*[(@id = "transAbstract")]//p');
			if (i.abstractNote.match(/Der Artikel .* wurde .* in der Zeitschrift .* veröffentlicht\.null$/) !== null) {
				i.abstractNote = '';
			}
		}
		i.abstractNote = i.abstractNote.replace('\.null', '.');
		if (i.ISSN == "1868-9027") {
			if (reviewURLs.includes(i.url)) {
			i.tags.push('Book Review');
		}
		}
		i.complete();
	});
	translator.translate();
}
