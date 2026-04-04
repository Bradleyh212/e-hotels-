const form = document.getElementById('searchForm');
const resetBtn = document.getElementById('resetBtn');
const resultsDiv = document.getElementById('results');
const statusMessage = document.getElementById('statusMessage');

const API_BASE = 'http://localhost:3000';

function buildQueryString(formData) {
	const params = new URLSearchParams();

	for (const [key, value] of formData.entries()) {
		if (value.trim() !== '') {
			params.append(key, value.trim());
		}
	}

	return params.toString();
}

function renderRooms(rooms) {
	resultsDiv.innerHTML = '';

	if (!rooms.length) {
		statusMessage.textContent = 'No rooms found for the selected filters.';
		return;
	}

	statusMessage.textContent = `${rooms.length} room(s) found.`;

	rooms.forEach(room => {
		const card = document.createElement('div');
		card.className = 'room-card';

		card.innerHTML = `
			<h3>${room.hotel_name} - Room ${room.room_number}</h3>
			<p><strong>Capacity:</strong> ${room.capacity}</p>
			<p><strong>View:</strong> ${room.view_type ?? 'N/A'}</p>
			<p><strong>Price:</strong> $${room.price}</p>
			<p><strong>Rating:</strong> ${room.rating} stars</p>
			<p><strong>Address:</strong> ${room.address}</p>
			<p><strong>Status:</strong> ${room.status}</p>
		`;

		resultsDiv.appendChild(card);
	});
}

async function searchRooms(event) {
	if (event) {
		event.preventDefault();
	}

	statusMessage.textContent = 'Loading...';
	resultsDiv.innerHTML = '';

	const formData = new FormData(form);
	const queryString = buildQueryString(formData);
	const url = `${API_BASE}/api/rooms/available${queryString ? `?${queryString}` : ''}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Failed to fetch rooms');
		}

		renderRooms(data);
	} catch (error) {
		statusMessage.textContent = `Error: ${error.message}`;
	}
}

form.addEventListener('submit', searchRooms);

resetBtn.addEventListener('click', () => {
	form.reset();
	statusMessage.textContent = '';
	resultsDiv.innerHTML = '';
	searchRooms();
});

window.addEventListener('DOMContentLoaded', () => {
	searchRooms();
});