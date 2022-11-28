{
	"translatorID": "5e3f67c9-f4e5-4dc6-ad9a-93bf263a585a",
	"label": "ubtue_Philosophy Documentation Center",
	"creator": "Madeesh Kannan",
	"target": "^https://www.pdcnet.org/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 145,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-11-28 14:12:46"
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

function getSearchResults(doc, checkOnly) {
	/*<a class="purchase" href="https://www.pdcnet.org/jsce/content/jsce_2021_0041_0002_0207_0224" target="rights" 
	onclick="ntptEventTag('Access_Method=Regular&amp;
	Access_Type=Controlled&amp;Event_Type=Request&amp;
	Event_Detail=Abstract_landing&amp;
	Section_Type=Article&amp;Data_Type=
	Database&amp;Item_Data_Type=Other&amp;Date
	/Time=2022-09-29 14:59:08&amp;
	Url=https%3A%2F%2Fwww.pdcnet.org%2F
	collection-anonymous%2Fbrowse%3Ffp%3D
	jsce%26fq%3Djsce%252FVolume%252F8959%257C
	41%252F8998%257CIssue%253A%2B2%252F&amp;
	IP_Address=134.2.66.48&amp;User_Agent=
	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:105.0) 
	Gecko/20100101 Firefox/105.0&amp;Site_ID=individual&
	amp;Site_Name=anonymous&amp;
	Title=Journal of the Society of Christian Ethics&amp;
	Item_Title=Of Wild Beasts and Bloodhounds: 
	John Locke and Frederick Douglass on the Forfeiture 
	of Humanity&amp;Publisher=Philosophy Documentation 
	Center&amp;YOP=2021&amp;Authors=&amp;DOI=10.5840/
	jsce202111548&amp;ISBN=&amp;Print_ISSN=1540-7942&amp;
	Online_ISSN=2326-2176&amp;URI=https://www.pdcnet.org
	/jsce/content/jsce_2021_0041_0002_0207_0224');
	">view</a>*/
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//tr/td');
	for (let row of rows) {
		if (ZU.xpathText(row, './/a[@class="purchase"]')) {
		let href = ZU.xpathText(row, './/a[@class="purchase"]/@href');
		let title = ZU.trimInternal(ZU.xpathText(row, './/label'));
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
		}
	}
	return found ? items : false;
}


function detectWeb(doc, url) {
	if (getSearchResults(doc, true)) return "multiple";
	else if (url.includes('/content/')) return "journalArticle";
	else return false;
}

function invokeEMTranslator(doc) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		if (ZU.xpathText(doc, '//div[@id="articleInfo"]//b')) {
			if (ZU.xpathText(doc, '//div[@id="articleInfo"]//b').includes(i.title) && ZU.xpathText(doc, '//div[@id="articleInfo"]//b').includes('"')) {
			i.title = ZU.xpathText(doc, '//div[@id="articleInfo"]//b');
			}
		}
		if (i.abstractNote && ZU.xpathText(doc, '//div[@id="articleInfo"]//i')) {
			if (ZU.xpathText(doc, '//div[@id="articleInfo"]//i').includes(i.abstractNote) && ZU.xpathText(doc, '//div[@id="articleInfo"]//b').includes('"')) {
			i.abstractNote = ZU.xpathText(doc, '//div[@id="articleInfo"]//i');
			}
		}
		i.itemType = "journalArticle";
		i.attachments = []
		i.complete();
	});
	translator.translate();
}


function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		Zotero.selectItems(getSearchResults(doc, false), function (items) {
			if (items) ZU.processDocuments(Object.keys(items), invokeEMTranslator);
		});
	}
	else {
		invokeEMTranslator(doc, url);
	}
}
/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
