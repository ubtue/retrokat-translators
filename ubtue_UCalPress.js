{
	"translatorID": "556e5565-195f-49cd-bedf-51eb721b5e02",
	"label": "ubtue_UCalPress",
	"creator": "Helena Nebel",
	"target": ".ucpress.edu/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 97,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-07-11 14:43:21"
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
	var rows = ZU.xpath(doc, '//div[contains(@class, "article-item")]');
	//Z.debug(rows)
	for (let row of rows) {
		//Z.debug(row.textContent)
		let href = ZU.xpathText(row, './/a[contains(@href, "/article-abstract/")]/@href');
		let title = ZU.trimInternal(row.textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}


function invokeRISTranslator(doc) {
	var baseurl = "https://online.ucpress.edu";
	var post = baseurl + ZU.xpathText(doc, '(//div[@id="getCitation"]//a[contains(@href, "citationFormat=0")]/@href)[1]');
	ZU.doGet(post, function (text) {
		var translator = Zotero.loadTranslator("import");
		translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
		translator.setString(text);
		translator.setHandler("itemDone", function (obj, item) {
			if (item.date) {
				item.date = ZU.strToISO(item.date);
			}
			if (item.abstractNote) i.abstractNote = item.abstractNote.replace(/^ABSTRACT:\s+/, "");
			item.attachments = [];
			for (let keyword of ZU.xpath(doc, '//div[@class="content-metadata-keywords"]//a')) {
				item.tags.push(keyword.textContent);
			}
			if (["Free", "Open Access"].includes(ZU.xpathText(doc, '//i[contains(@class, "icon-availability")]/@title'))) {
				item.notes.push('LF:');
			}
			if ((ZU.xpathText(doc, '//span[contains(@class, "article-client_type")]').match(/^Book\s+Review/i))) {
				item.tags.push("Book Review");
			}
			let publications = ZU.xpath(doc, '//div[@class="product"]');
			for (let p = 0; p < publications.length; p++) {
				let reviewed_title = ZU.xpathText(publications[p], './/div[contains(@class, "source")]');
				if (reviewed_title == null) {reviewed_title = ZU.xpathText(publications[p], './/em');}
				let namesString = '';
				let names = ZU.xpath(publications[p], './/div[@class="name"]');
				for (let n = 0; n < names.length; n++) {
				let reviewed_author_given = ZU.xpathText(names[n], './/div[@class="given-names"]');
				let reviewed_author_surname = ZU.xpathText(names[n], './/div[@class="surname"]');
				namesString += '::' + reviewed_author_surname + ', ' +  reviewed_author_given;
				}
				if (namesString == "") {
					if (ZU.xpathText(doc, '//span[@class="name string-name"]') != null) {
						for (let name of ZU.xpathText(doc, '//span[@class="name string-name"]').split(/\s+and\s+|,\s+/)) {
							let authorProcessed = ZU.cleanAuthor(name, 'author');
							namesString += '::' + authorProcessed.lastName + ', ' +  authorProcessed.firstName;
						
						}
					}
				}
				let reviewed_year = ZU.xpathText(publications[p], './/div[@class="year"]');
				let reviewed_publisher = ZU.xpathText(publications[p], './/div[@class="publisher-name"]');
				let reviewed_place = ZU.xpathText(publications[p], './/div[@class="publisher-loc"]');
				item.tags.push('#reviewed_pub#title::' + reviewed_title + '#name' + namesString + '#year::' + reviewed_year + '#publisher::' + reviewed_publisher + '#place::' + reviewed_place + '#');
				
				
			}
			item.complete();
		});
		translator.translate();
	});






	
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
			ZU.processDocuments(articles, invokeRISTranslator);
		});
	} else {
		invokeRISTranslator(doc, url);
	}
}






/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://online.ucpress.edu/nr/article/24/3/121/115855/Review-Race-and-New-Religious-Movements-in-the-USA",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Review: Race and New Religious Movements in the USA: A Documentary Reader, edited by Emily Suzanne Clark and Brad Stoddard",
				"creators": [
					{
						"lastName": "Booker",
						"firstName": "Vaughn A.",
						"creatorType": "author"
					}
				],
				"date": "2021-02-01",
				"DOI": "10.1525/nr.2021.24.3.121",
				"ISSN": "1092-6690",
				"issue": "3",
				"journalAbbreviation": "Nova Religio",
				"libraryCatalog": "ubtue_UCalPress",
				"pages": "121-122",
				"publicationTitle": "Nova Religio",
				"shortTitle": "Review",
				"url": "https://doi.org/10.1525/nr.2021.24.3.121",
				"volume": "24",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Race and New Religious Movements in the USA: A Documentary Reader#name::Clark, Emily Suzanne::Stoddard, Brad#year::2019#publisher::Bloomsbury Academic#place::null#"
					},
					{
						"tag": "Book Review"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://online.ucpress.edu/nr/issue/24/3",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://online.ucpress.edu/nr/issue/1/1",
		"items": "multiple"
	}
]
/** END TEST CASES **/
