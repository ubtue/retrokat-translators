{
	"translatorID": "68643a57-3182-4e27-b34a-326347044d89",
	"label": "ubtue_Oxford Academic",
	"creator": "Madeesh Kannan",
	"target": "^https?://academic\\.oup\\.com",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 95,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-11-29 13:38:30"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

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
	if (url.match(/\/issue\/.+\/.+/)) {
		return "multiple";
	} else if (url.match(/\/(advance-)?article\/.+\/.+\//)) {
		// placeholder, actual type determined by the embedded metadata translator
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, "//div[contains(@class, 'al-article-items')]/h5[contains(@class, 'item-title')]/a");
	for (let i = 0; i < rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		Z.debug(i.creators);
		// update abstract from the webpage as the embedded data is often incomplete
		if (i.creators.length > 1) {
		let authorList = ZU.xpath(doc, '//div[@class="info-card-name"]');
		let authorNamesListNormalized = [];
		for (let a of authorList) {
			
			if (a.innerHTML.indexOf('<') != -1) {
				a = a.innerHTML.substring(0, a.innerHTML.indexOf('<'));
			}
			else a = a.textContent.replace(/\*/g, '');
			a = ZU.trimInternal(a);
			a = a.toLowerCase();
			a = a.split(',')[0];
			a = a.replace(/\./g, ' ').replace(/\s+/g, ' ');
			authorNamesListNormalized.push(a);
		}
		Z.debug(authorNamesListNormalized);
		let authorsNotFoundList = [];
		let authorsNotFound = [];
		let authorIndex = 0;
		for (let c of i.creators) {
			let uninvertedName = c.firstName + ' ' + c.lastName;
			uninvertedName = uninvertedName.toLowerCase();
			uninvertedName = uninvertedName.replace(/\./g, ' ').replace(/\s+/g, ' ');
			if (!authorNamesListNormalized.includes(uninvertedName)) {
				authorsNotFoundList.push(uninvertedName);
				authorsNotFound.push(c);
			}
			authorIndex += 1;
		}
		Z.debug(authorsNotFoundList);
		let trueAuthorNamesFound = false;
		if (authorsNotFoundList.length == 2) {
			if (authorNamesListNormalized.indexOf(authorsNotFoundList.join(' ')) != -1) {
				trueAuthorNamesFound = true;
			}
			else {
				authorsNotFoundList.reverse();
				if (authorNamesListNormalized.indexOf(authorsNotFoundList.join(' ')) != -1) {
					trueAuthorNamesFound = true;
				}
			}
		}
		
		if (trueAuthorNamesFound) {
			creatorIndex = 0;
					newCreator = {};
					creatorsToDelete = [];
					for (let creator of i.creators) {
						if (authorsNotFound.includes(creator)) {
							
							if (creator.lastName.match(/^.$/)) {
								creator.lastName += '.';
							}
							if (creatorIndex == 1) {
								newCreator.firstName = creator.firstName + ' ' + creator.lastName;
								newCreator.creatorType = "author"
							}
							else if (creatorIndex == 0) {
								newCreator.lastName = creator.firstName + ' ' + creator.lastName;
							}
							creatorIndex += 1;
						}
					}
			i.creators.push(newCreator);
		}
		for (let authorNotFound of authorsNotFound) {
			let creatorIndex = i.creators.indexOf(authorNotFound);
			i.creators.splice(creatorIndex, 1);
		}
		}
		
		var abstractText = ZU.xpathText(doc, '//section[@class="abstract"]');
		if (abstractText) i.abstractNote = abstractText;
		let section = ZU.xpathText(doc, '//div[(@class="article-metadata-tocSections")]//a');
		let tagreview = ZU.xpathText(doc, '//*[(@id = "ContentTab")]//a');
		let extractText = ZU.xpathText(doc, '//p[@class="chapter-para"]');
		if (tagreview != null) {
		if (tagreview.match(/(\bReviews?\b)|(\bBook(\s+)?Reviews?\b)|(\bReview(\s+)?Article\b)|(\bBook(s)?(\s+)?Note(s)?\b)|(\bShort(\s+)?not(ic)?e(s)?)/i)) {
			i.tags.push('Book Review');
			i.abstractNote = extractText;
			if (extractText != null) {
			if (extractText.length > 800) {
				i.abstractNote = extractText.substring(0, 800);
				let lastIndex = i.abstractNote.lastIndexOf('.');
				i.abstractNote = i.abstractNote.substring(0, lastIndex + 1);
				Z.debug(i.abstractNote);
			}
			}
		}
		}
		if (section != 0) {
			if (section.match(/(\bReviews?\b)|(\bBook(\s+)?Reviews?\b)|(\bReview(\s+)?Article\b)|(\bBook(s)?(\s+)?Note(s)?\b)|(\bShort(\s+)?notice(s)?)/i)) i.tags.push('Book Review');
		}
		// if the article are review article, then the full text extract is scraped from the HTML
		let publications = ZU.xpath(doc, '//div[@class="product"]');
		for (let p = 0; p < publications.length; p++) {
			let reviewed_title = ZU.xpathText(publications[p], './/div[contains(@class, "source")]');
			if (reviewed_title == null) {reviewed_title = ZU.xpathText(publications[p], './/em');}
			// mehrere Namen auch noch trennen!
			let namesString = '';
			let names = ZU.xpath(publications[p], './/div[@class="name"]');
			for (let n = 0; n < names.length; n++) {
			let reviewed_author_given = ZU.xpathText(names[n], './/div[@class="given-names"]');
			let reviewed_author_surname = ZU.xpathText(names[n], './/div[@class="surname"]');
			namesString += '::' + reviewed_author_surname + ', ' +  reviewed_author_given;
			}
			let reviewed_year = ZU.xpathText(publications[p], './/div[@class="year"]');
			let reviewed_publisher = ZU.xpathText(publications[p], './/div[@class="publisher-name"]');
			let reviewed_place = ZU.xpathText(publications[p], './/div[@class="publisher-loc"]');
			i.tags.push('#reviewed_pub#title::' + reviewed_title + '#name' + namesString + '#year::' + reviewed_year + '#publisher::' + reviewed_publisher + '#place::' + reviewed_place + '#');
			
			
		}
		if (ZU.xpathText(doc, '//i[@class="icon-availability_open"]/@title') != null) {
			if (ZU.xpathText(doc, '//i[@class="icon-availability_open"]/@title').match(/open access/i)) {
				i.notes.push("LF:");
			}
		}
		else if (ZU.xpathText(doc, '//i[@class="icon-availability_free"]/@title') != null) {
			if (ZU.xpathText(doc, '//i[@class="icon-availability_free"]/@title').match(/free/i)) {
				i.notes.push("LF:");
			}
		}
		let orcid = 'lala';
		let author_information_tags = ZU.xpath(doc, '//div[@id="authorInfo_OUP_ArticleTop_Info_Widget"]');
		for (let a = 0; a < author_information_tags.length; a++) {
			if (ZU.xpathText(author_information_tags[a], './/div[@class="info-card-location"]') != null) {
				let orcid = ZU.xpathText(author_information_tags[a], './/div[@class="info-card-location"]').trim();
				orcid = orcid.replace('https://orcid.org/', '');
				let author = ZU.xpathText(author_information_tags[a], './/div[@class="info-card-name"]').trim();
				i.notes.push({note: "orcid:" + orcid + ' | ' + author});
			}
		}
		i.attachments = [];
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else {
		invokeEmbeddedMetadataTranslator(doc, url);
	}
}



/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://academic.oup.com/jss/article/65/1/245/5738633?login=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch: Visions of YHWH",
				"creators": [
					{
						"firstName": "George",
						"lastName": "Savran",
						"creatorType": "author"
					}
				],
				"date": "2020/04/01",
				"DOI": "10.1093/jss/fgz049",
				"ISSN": "0022-4480",
				"issue": "1",
				"journalAbbreviation": "J Semit Stud",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "245-246",
				"publicationTitle": "Journal of Semitic Studies",
				"shortTitle": "Nevada Levi Delapp, Theophanic “Type-Scenes” in the Pentateuch",
				"url": "https://academic.oup.com/jss/article/65/1/245/5738633",
				"volume": "65",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Theophanic “Type-Scenes” in the Pentateuch: Visions of YHWH#name::Delapp, Nevada Levi#year::2018#publisher::Bloomsbury T & T Clark#place::London#"
					},
					{
						"tag": "Book Review"
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
		"url": "https://academic.oup.com/litthe/article/34/1/122/5245305?login=true",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Mariner: A Voyage with Samuel Taylor Coleridge. By Malcolm Guite",
				"creators": [
					{
						"firstName": "Robin",
						"lastName": "Schofield",
						"creatorType": "author"
					}
				],
				"date": "2020/03/01",
				"DOI": "10.1093/litthe/fry035",
				"ISSN": "0269-1205",
				"abstractNote": "This is an ambitious revisionary study. Malcolm Guite combines literary, theological, and ecological perspectives to shed new light on the ‘rich spirituality’ of Coleridge’s work, in the sacramental theology of his Rime of the Ancient Mariner (p. 8). Guite recounts Coleridge’s life story around a religious and ecological, ultimately polemical, reading of the Rime. Guite’s rationale for the biographical strand of his study is based on the poet’s retrospective self-identification with his protagonist. The book is divided into two sections. In Part One, Guite narrates Coleridge’s life up to the year of extraordinary creativity at Nether Stowey, which spanned summer 1797 to summer 1798.",
				"issue": "1",
				"journalAbbreviation": "Literature and Theology",
				"language": "en",
				"libraryCatalog": "academic.oup.com",
				"pages": "122-124",
				"publicationTitle": "Literature and Theology",
				"shortTitle": "Mariner",
				"url": "https://academic.oup.com/litthe/article/34/1/122/5245305",
				"volume": "34",
				"attachments": [],
				"tags": [
					{
						"tag": "#reviewed_pub#title::Mariner: A Voyage with Samuel Taylor Coleridge#name::Guite, Malcolm#year::2017#publisher::Hodder & Stoughton#place::London#"
					},
					{
						"tag": "Book Review"
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
		"url": "https://academic.oup.com/litthe/issue/35/2",
		"items": "multiple"
	}
]
/** END TEST CASES **/
