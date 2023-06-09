{
	"translatorID": "bd3d109b-d5e5-44d4-aee1-e54b734eac96",
	"label": "Bildungsforschung (OJS Tue)",
	"creator": "Madeesh Kannan",
	"target": "^https?://ojs4.uni-tuebingen.de/ojs/index.php/bildungsforschung/issue/view/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 150,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2018-06-20 08:03:01"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2018 Universitätsbibliothek Tübingen.  All rights reserved.

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


// since the COinS translator doesn't correctly return URLs as identifiers in pages with multiple items
// this wrapper fixes that and calls the OJS translator on the individual objects
function detectWeb(doc, url) {
	// it should always be a TOC (which can optionally be empty)
	var links = ZU.xpath(doc, '//div[@class="tocTitle"]/a');
	return links.length > 0 ? "multiple" : false;
}

function getLinks(doc) {
	var items = {};
	var links = ZU.xpath(doc, '//div[@class="tocTitle"]/a');
	for (let i = 0; i < links.length; i++) {
		let href = links[i].href;
		let title = ZU.trimInternal(links[i].textContent);
		items[href] = title;
	}
	return items;
}

function processDoc(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("99b62ba4-065c-4e83-a5c0-d8cc0c75d388");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == false)
		return;

	Zotero.selectItems(getLinks(doc), function (items) {
		if (!items)
			return true;
		var articles = [];
		for (var i in items) {
			articles.push(i);
		}
		ZU.processDocuments(articles, processDoc);
		Zotero.wait();
	});
}


/** BEGIN TEST CASES **/
var testCases = []
/** END TEST CASES **/
