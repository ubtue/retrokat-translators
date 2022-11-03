{
	"translatorID": "b4331650-ac75-4cc2-abd2-8a62b07bf3d6",
	"label": "ubtue_scholarlypublishing",
	"creator": "Helena Nebel",
	"target": "scholarlypublishingcollective\\.org\\/",
	"minVersion": "3.0.4",
	"maxVersion": "",
	"priority": 97,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-03 08:56:43"
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
	if (url.match(/\/issue\//) && getSearchResults(doc, true)) {
		return "multiple";
	} 
	else return "journalArticle";
}

function getSearchResults(doc, checkOnly) {
  let items = {};
  let found = false;
  
  rows = ZU.xpath(doc, '//h5[contains(@class,"item-title")]/a');
  for (let row of rows) {
	if (row.href.match(/\/article\//)) {
	let href = ZU.xpathText(row, './@href');
	let title = row.textContent;
	if (!href || !title) continue;
	if (checkOnly) return true;
	found = true;
	items[href] = title;
  }
  }
  return found ? items : false;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		i.attachments = [];
		for (let tag of ZU.xpath(doc, '//div[@class="kwd-group"]/a/@data-keyword')) {
			i.tags.push(tag.textContent);
		}
		let reviewTag = ZU.xpathText(doc, '//span[@class="article-client_type"]');
		if (reviewTag != null) {
			if (reviewTag.match(/^Book\s*review/i) != null) {
				i.tags.push('RezensionstagPica');
				i.abstractNote = "";
			}
		}
		i.abstractNote = "";
		if (ZU.xpathText(doc, '//i[@class="icon-availability_unlocked"]/@title') == "Available") {
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
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
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
