{
	"translatorID": "d35bb95a-0eb0-471e-9b46-af88fcedc6fc",
	"label": "JSTOR_file",
	"creator": "Helena Nebel",
	"target": "134\\.2\\.66",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-09-27 11:52:06"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2016 Sebastian Karcher
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
	return "multiple";
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		//Z.debug('Snargle');
		var rows = ZU.xpath(doc, '//div[@class="article"]');
		for (var i = 0; i < rows.length; i++) {
		var href = ZU.xpathText(rows[i], './/div[@class="url"]');
		//Z.debug(href);
		var title = ZU.trimInternal(ZU.xpathText(rows[i], './/div[@class="article-title"]'));
		//Z.debug(title);
		scrape(rows[i], href);
	}
	}
}


function scrape(doc, url) {
	let risEntry = ZU.xpathText(doc, './/div[@class="ris"]');
	let doiEntry = ZU.xpathText(doc, './/div[@class="doi"]');
	Z.debug(doiEntry);
	if (doiEntry.includes('DOI: ')) {
		var doi = doiEntry.split('DOI: ')[1].replace(/\.$/, '');
	}
	// RIS translator
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(risEntry);
	var review = risEntry.match(/^RI\s+-\s+(.+)/m);
	// sometimes we have subtitles stored in T1. These are part of the title, we want to add them later
	var subtitle = risEntry.match(/^T1\s+-\s+(.+)/m);
	translator.setString(risEntry);
	translator.setHandler("itemDone", function (obj, item) {
		// author names are not (always) supplied as lastName, firstName in RIS
		// we fix it here (note sure if still need with new RIS)
		
		var m;
		for (var i = 0, n = item.creators.length; i < n; i++) {
			if (!item.creators[i].firstName
				&& (m = item.creators[i].lastName.match(/^(.+)\s+(\S+)$/))) {
				item.creators[i].firstName = m[1];
				item.creators[i].lastName = m[2];
				delete item.creators[i].fieldMode;
			}
		}

		// fix special characters in abstract, convert html linebreaks and italics, remove stray p tags; don't think they use anything else
		if (item.abstractNote) {
			item.abstractNote = convertCharRefs(item.abstractNote);
			item.abstractNote = item.abstractNote
									.replace(/<\/p><p>/g, "\n")
									.replace(/<em>(.+?)<\/em>/g, " <i>$1</i> ")
									.replace(/<\/?p>/g, "")
									.replace(/^\[/, "")
									.replace(/\]$/, "")
									.replace(/ABSTRACT/, "")
									.trim();
		}
		// Don't save HTML snapshot from 'UR' tag
		item.attachments = [];

		if (item.ISSN) {
			item.ISSN = ZU.cleanISSN(item.ISSN);
		}

		if (doi)
			item.DOI = doi
		else {
			item.DOI = ZU.xpathText(doc, '//div[contains(@class,"doi")]');
			if (item.DOI)
				item.DOI = item.DOI.replace(/DOI\:\s+/, "");
		}
		item.tags = ZU.xpath(doc, '//div[contains(@class,"topics-list")]//a').map(function(x) { return x.textContent.trim(); })

		if (subtitle){
			item.title = item.title + ": " + subtitle[1]
		}
		// reviews don't have titles in RIS - we get them from the item page
		if (!item.title && review) {
			var reviewedTitle = review[1];
			// A2 for reviews is actually the reviewed author
			var reviewedAuthors = [];
			for (i = 0; i < item.creators.length; i++) {
				if (item.creators[i].creatorType == "editor") {
					reviewedAuthors.push(item.creators[i].firstName + " " + item.creators[i].lastName);
					item.creators[i].creatorType = "reviewedAuthor";
				}
			}
			// remove any reviewed authors from the title
			for (i = 0; i < reviewedAuthors.length; i++) {
				reviewedTitle = reviewedTitle.replace(reviewedAuthors[i], "");
			}
			reviewedTitle = reviewedTitle.replace(/[\s.,]+$/, "");
			item.title = "Review of " + reviewedTitle;
		}

		item.url = item.url.replace('http:', 'https:'); // RIS still lists http addresses while JSTOR's stable URLs use https
		if (item.url && !item.url.startsWith("http")) item.url = "https://" + item.url;
		item.complete();
	});

	translator.getTranslatorObject(function (trans) {
		trans.doImport();
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/200965",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Terror, Trauma and the 'Young Marx' Explanation of Jacobin Politics",
				"creators": [
					{
						"lastName": "Higonnet",
						"firstName": "Patrice L. R",
						"creatorType": "author"
					}
				],
				"date": "2006",
				"ISSN": "1477-464X",
				"issue": "1",
				"libraryCatalog": "Project MUSE",
				"pages": "121-164",
				"publicationTitle": "Past & Present",
				"url": "https://muse.jhu.edu/article/200965",
				"volume": "191",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/issue/597",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/book/785",
		"items": [
			{
				"itemType": "book",
				"title": "Writing the Forest in Early Modern England: A Sylvan Pastoral Nation",
				"creators": [
					{
						"lastName": "Theis",
						"firstName": "Jeffrey S.",
						"creatorType": "author"
					}
				],
				"date": "2009",
				"ISBN": "9780820705057",
				"abstractNote": "In Writing the Forest in Early Modern England: A Sylvan Pastoral Nation, Jeffrey S. Theis focuses on pastoral literature in early modern England as an emerging form of nature writing. In particular, Theis analyzes what happens when pastoral writing is set in forests — what he terms “sylvan pastoral.”\nDuring the sixteenth and seventeenth centuries, forests and woodlands played an instrumental role in the formation of individual and national identities in England. Although environmentalism as we know it did not yet exist, persistent fears of timber shortages led to a larger anxiety about the status of forests. Perhaps more important, forests were dynamic and contested sites of largely undeveloped spaces where the poor would migrate in a time of rising population when land became scarce. And in addition to being a place where the poor would go, the forest also was a playground for monarchs and aristocrats where they indulged in the symbolically rich sport of hunting.\nConventional pastoral literature, then, transforms when writers use it to represent and define forests and the multiple ways in which English society saw these places. In exploring these themes, authors expose national concerns regarding deforestation and forest law and present views relating to land ownership, nationhood, and the individual’s relationship to nature. Of particular interest are the ways in which cultures turn confusing spaces into known places and how this process is shaped by nature, history, gender, and class.\nTheis examines the playing out of these issues in familiar works by Shakespeare, such as A Midsummer Night’s Dream, The Merry Wives of Windsor, and As You Like It, Andrew Marvell’s “Upon Appleton House,” John Milton’s Mask and Paradise Lost, as well as in lesser known prose works of the English Revolution, such as James Howell’s Dendrologia>/i> and John Evelyn’s Sylva.\nAs a unique ecocritical study of forests in early modern English literature, Writing the Forest makes an important contribution to the growing field of the history of environmentalism, and will be of interest to those working in literary and cultural history as well as philosophers concerned with nature and space theory.",
				"libraryCatalog": "Project MUSE",
				"place": "Pittsburgh",
				"publisher": "Duquesne University Press",
				"shortTitle": "Writing the Forest in Early Modern England",
				"url": "https://muse.jhu.edu/book/785",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/530509",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Pill at Fifty: Scientific Commemoration and the Politics of American Memory",
				"creators": [
					{
						"lastName": "Prescott",
						"firstName": "Heather",
						"creatorType": "author"
					}
				],
				"date": "2013",
				"DOI": "10.1353/tech.2013.0137",
				"ISSN": "1097-3729",
				"abstractNote": "This article uses coverage of the fiftieth anniversary of the Pill as an example of what Richard Hirsh describes as the “real world” role of historians of technology. It explores how the presentation of historical topics on the world wide web has complicated how the history of technology is conveyed to the public. The article shows that that the Pill is especially suited to demonstrating the public role of historians of technology because, as the most popular form of reversible birth control, it has touched the lives of millions of Americans. Thus, an exploration of how the Pill’s fiftieth anniversary was covered illustrates how historians can use their expertise to provide a nuanced interpretation of a controversial topic in the history of technology.",
				"issue": "4",
				"libraryCatalog": "Project MUSE",
				"pages": "735-745",
				"publicationTitle": "Technology and Culture",
				"shortTitle": "The Pill at Fifty",
				"url": "https://muse.jhu.edu/article/530509",
				"volume": "54",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/551992",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Accountability and Corruption in Argentina During the Kirchners’ Era",
				"creators": [
					{
						"lastName": "Manzetti",
						"firstName": "Luigi",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"DOI": "10.1353/lar.2014.0030",
				"ISSN": "1542-4278",
				"abstractNote": "This article highlights an important paradox: in Argentina between 2003 and 2013 the center-left Peronist government’s approach to governance mirrors that of the center-right Peronist administration of the 1990s. While the latter centralized authority to pursue neoliberal reforms, the former have centralized authority in the name of expanding government intervention in the economy. In both cases, corruption has tended to go unchecked due to insufficient government accountability. Therefore, although economic policies and political rhetoric have changed dramatically, government corruption remains a constant of the Argentine political system due to the executive branch’s ability to emasculate constitutional checks and balances.",
				"issue": "2",
				"libraryCatalog": "Project MUSE",
				"pages": "173-195",
				"publicationTitle": "Latin American Research Review",
				"url": "https://muse.jhu.edu/article/551992",
				"volume": "49",
				"attachments": [],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/762340",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "American Judaism and the Second Vatican Council: The Response of the American Jewish Committee to Nostra Aetate",
				"creators": [
					{
						"lastName": "Dziaczkowska",
						"firstName": "Magdalena",
						"creatorType": "author"
					}
				],
				"date": "2020",
				"DOI": "10.1353/cht.2020.0018",
				"ISSN": "1947-8224",
				"abstractNote": "During the Second Vatican Council, American Jewish community members impacted the drafting of the declaration on the Catholic Church's attitude toward Jews and Judaism. This article explores the American Jewish Committee's reactions to the drafting and promulgation of the Declaration on the Relation of the Church with Non-Christian Religions (Nostra Aetate) and its contribution to establishing interfaith relations. The varied Jewish reactions to the declaration provide insight into the internal Jewish discussions regarding Nostra Aetate, revealing that even though the declaration is assessed positively today, initial Jewish reactions were not enthusiastic.",
				"issue": "3",
				"libraryCatalog": "Project MUSE",
				"pages": "25-47",
				"publicationTitle": "U.S. Catholic Historian",
				"shortTitle": "American Judaism and the Second Vatican Council",
				"url": "https://muse.jhu.edu/article/762340",
				"volume": "38",
				"attachments": [],
				"tags": [
					{
						"tag": " Abram"
					},
					{
						"tag": " American Jewish Committee"
					},
					{
						"tag": " Bea"
					},
					{
						"tag": " Cardinal Augustin"
					},
					{
						"tag": " Declaration on the Relation of the Church with Non-Christian Religions"
					},
					{
						"tag": " Jewish-Catholic relations"
					},
					{
						"tag": " Marc"
					},
					{
						"tag": " Morris B."
					},
					{
						"tag": " Second Vatican Council"
					},
					{
						"tag": " Tanenbaum"
					},
					{
						"tag": " interreligious dialogue"
					},
					{
						"tag": "Nostra Aetate"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/issue/44583",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/795002",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Climate Change and the Art of Devotion: Geoaesthetics in the Land of Krishna, 1550–1850 by Sugata Ray (review)",
				"creators": [
					{
						"lastName": "Barbato",
						"firstName": "Melanie",
						"creatorType": "author"
					}
				],
				"date": "2021",
				"DOI": "10.1353/cro.2021.0019",
				"ISSN": "1939-3881",
				"issue": "2",
				"libraryCatalog": "Project MUSE",
				"pages": "222-225",
				"publicationTitle": "CrossCurrents",
				"shortTitle": "Climate Change and the Art of Devotion",
				"url": "https://muse.jhu.edu/article/795002",
				"volume": "71",
				"attachments": [],
				"tags": [
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
		"url": "https://muse.jhu.edu/issue/40342",
		"items": "multiple"
	},
	{
		"type": "web",
		"url": "https://muse.jhu.edu/article/724069",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Recovering the Multiple Worlds of the Medieval Church: Thoughtful Lives, Inspired Critics, and Changing Narratives",
				"creators": [
					{
						"lastName": "Van Engen",
						"firstName": "John",
						"creatorType": "author"
					}
				],
				"date": "2019",
				"DOI": "10.1353/cat.2019.0012",
				"ISSN": "1534-0708",
				"abstractNote": "The author describes his formative influences, his mentors, and his scholarship in Medieval history at the University of Notre Dame.",
				"issue": "4",
				"libraryCatalog": "Project MUSE",
				"pages": "vi-613",
				"publicationTitle": "The Catholic Historical Review",
				"shortTitle": "Recovering the Multiple Worlds of the Medieval Church",
				"url": "https://muse.jhu.edu/article/724069",
				"volume": "104",
				"attachments": [],
				"tags": [
					{
						"tag": " Bernard of Clairvaux"
					},
					{
						"tag": " Cenobitism"
					},
					{
						"tag": " Christianization"
					},
					{
						"tag": " Devotio Moderna"
					},
					{
						"tag": " Dutch Reformed Communities."
					},
					{
						"tag": " Hildegard of Bingen"
					},
					{
						"tag": " Marguerite Porete"
					},
					{
						"tag": " Rupert of Deutz"
					},
					{
						"tag": "Gerhart Ladner"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
