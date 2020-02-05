// var mymap = L.map('mapid').setView([22.8, 120], 8);
var mymap = L.map('mapid', {
	center: [25, 121.6],
	zoom: 9
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '<a target="_blank" href="https://www.openstreetmap.org/">© OpenStreetMap 貢獻者</a>',
	maxZoom: 18,
}).addTo(mymap);

const importantXML = new XMLHttpRequest();
importantXML.onload = function (e) {
	const importantData = JSON.parse(importantXML.response); // 口罩剩餘數量資料

	var oReq = new XMLHttpRequest();
	let store = [];
	oReq.onload = function (e) {
		store = JSON.parse(oReq.response);

		const cityData = new XMLHttpRequest();
		let selcetedData = [];

		cityData.onload = function (e) {
			const city = JSON.parse(cityData.response).data;
			const citySelect = document.getElementById('city');
			const cityArray = city.map(item => item.city);
			const notRepeatCity = cityArray.filter(function (element, index, arr) {
				return arr.indexOf(element) === index;
			});
			let str = '';
			notRepeatCity.forEach(item => {
				str += `<option>${item}</option>`
			});
			citySelect.innerHTML = str;
			// 監聽縣市 select
			citySelect.addEventListener('change', function () {
				selcetedData = [];
				const citySelectValue = document.getElementById('city').value;
				findStore(store, importantData, citySelectValue);
				findDistrict(city, citySelectValue);
			})
			findStore(store, importantData, citySelect.options[0].value);
			findDistrict(city, citySelect.options[0].value);
		}
		cityData.open("GET", './latlng.json');
		cityData.send();
	}
	oReq.open("GET", './med-store.json');
	oReq.send();
}
importantXML.open("GET", './maskmock.json');
importantXML.send();

function findDistrict(city, value) {
	const districtSelect = document.getElementById('district');
	let substr = '<option value="all">選擇鄉鎮市區</option>';
	city.forEach(item => {
		if (item.city == value) {
			substr += `<option>${item.district}</option>`
		}
	})
	districtSelect.innerHTML = substr;
	districtSelect.addEventListener('change', function () {
		getFeaturesInView();
		const districtValue = document.getElementById('district').value;
		if (districtValue == 'all') {
			const cityValue = document.getElementById('city').value;
			findStore(store, cityValue);
		} else {
			findDistrictStore(districtValue);
		}
	});
}
function findStore(store, importantData, value) {
	const storePosition = document.getElementById('storePosition');
	let storeStr = '';
	selcetedData = [];
	store.forEach(item => {
		if (item['address'].includes(value)) {
			selcetedData.push(item);
			importantData.forEach(ele => {
				if (item['id'] == ele['醫事機構代碼']) {
					item.adultMask = ele['成人口罩總剩餘數'];
					item.childMask = ele['兒童口罩剩餘數'];
				}
			})
			storeStr += `[${item['name']}] <br>
			口罩剩餘：<strong>成人 - ${item['adultMask']} 個/ 兒童 - ${item['childMask']} 個</strong><br>
		地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
		電話: ${item['tel']}<br><hr>`
		}
	})
	storePosition.innerHTML = storeStr;
	document.getElementById('total').innerHTML = `總共有 ${selcetedData.length} 家`;
}
function getFeaturesInView() {
	mymap.eachLayer(function (layer) {
		if (layer instanceof L.Marker) {
			mymap.removeLayer(layer);
		}
	});
}

function findDistrictStore(value) {
	let storeStr = '';
	let selcetedDataList = []; // 用於計算篩選鄉鎮市後的數量
	selcetedData.forEach(item => {
		if (item['address'].includes(value)) {
			selcetedDataList.push(item);
			storeStr += `[${item['name']}] <br>
			口罩剩餘：<strong>成人 - ${item['adultMask']} 個/ 兒童 - ${item['childMask']} 個</strong><br>
		地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
		電話: ${item['tel']}<br><hr>`;
			if (typeof item.x == 'string') {
				const x = item.x.split('\n')[0]
				const y = item.y.split('\n')[0]
				L.marker([y, x]).addTo(mymap).bindPopup(`[${item['name']}] <br>
				口罩剩餘：<strong>成人 - ${item['adultMask']} 個/ 兒童 - ${item['childMask']} 個</strong><br>
			地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
			電話: ${item['tel']}<br>`);
			} else {
				L.marker([item.y, item.x]).addTo(mymap).bindPopup(`[${item['name']}] <br>
				口罩剩餘：<strong>成人 - ${item['adultMask']} 個/ 兒童 - ${item['childMask']} 個</strong><br>
			地址: <a href="https://www.google.com.tw/maps/place/${item['address']}" target="_blank">${item['address']}</a><br>
			電話: ${item['tel']}<br>`);;
			}
		}
	})
	storePosition.innerHTML = storeStr;
	document.getElementById('total').innerHTML = `總共有 ${selcetedDataList.length} 家`;
	const centerData = selcetedData[0];
	if (centerData.x && typeof centerData.x == 'string') {
		const x = centerData.x.split('\n')[0]
		const y = centerData.y.split('\n')[0]
		mymap.panTo(new L.LatLng(y, x));
	} else {
		mymap.panTo(new L.LatLng(centerData.y, centerData.x));
	}
}
// https://api.opencube.tw/twzipcode