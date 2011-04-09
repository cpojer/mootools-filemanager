/*
Script: Language.pl.js
	MooTools FileManager - Language Strings in Polish

Translation:
	[Marek Kalucki](http://www.webdeco.pl)
    [Grzegorz Nakonieczny](http://naki.info/)
*/

FileManager.Language.pl = {
	more: 'Szczegóły',
	width: 'Szerokość:',
	height: 'Wysokość:',
	
	ok: 'Ok',
	open: 'Wybierz plik',
	upload: 'Wyślij',
	create: 'Utwórz folder',
	createdir: 'Podaj nazwę folderu:',
	cancel: 'Anuluj',
	error: 'Błąd',
	
	information: 'Informacje',
	type: 'Typ:',
	size: 'Rozmiar:',
	dir: 'Ścieżka:',
	modified: 'Ost. modyfikacja:',
	preview: 'Podgląd',
	close: 'Zamknij',
	destroy: 'Usuń',
	destroyfile: 'Czy na pewno chcesz usunąć ten plik?',
	
	rename: 'Zmień nazwę',
	renamefile: 'Podaj nową nazwę pliku:',
	
	download: 'Pobierz',
	nopreview: '<i>Podgląd niedostępny</i>',
	
	title: 'Tytuł:',
	artist: 'Wykonawca:',
	album: 'Płyta:',
	length: 'Długość:',
	bitrate: 'Przepływność:',
	
	deselect: 'Odznacz',
	
	nodestroy: 'Usuwanie plików z serwera zostało wyłączone.',
	
	'upload.disabled': 'Wysyłanie plików na serwer zostało wyłączone.',
	'upload.authenticated': 'Nie jesteś upoważniony do wysyłania plików na serwer.',
	'upload.path': 'Folder do wysyłania plików nie istnieje. Skontaktuj się z administratorem.',
	'upload.exists': 'Folder do wysyłania plików istnieje. Skontaktuj się z administratorem.',
	'upload.mime': 'Typ wybranego pliku jest niedozwolony.',
	'upload.extension': 'Wysyłany plik ma nieznane lub niedozwolone rozszerzenie.',
	'upload.size': 'Rozmiar wysyłanego pliku jest zbyt duży. Wyślij mniejszy plik (jeśli wysyłasz obrazy-zmniejsz obraz na swoim komputerze i ponów wysyłanie).',
	'upload.partial': 'Plik nie został wysłany w całości. Ponów próbę wysyłki pliku.',
	'upload.nofile': 'Nie wybrano pliku do wysyłki.',
	'upload.default': 'Wystąpił błąd w trakcie wysyłki.',
	
	/* FU */
	uploader: {
		unknown: 'Wystąpił nieznany błąd.',
		sizeLimitMin: 'Nie można wybrać "<em>${name}</em>" (${size}), minimalny rozmiar pliku to <strong>${size_min}</strong>!',
		sizeLimitMax: 'Nie można wybrać "<em>${name}</em>" (${size}), maksymalny rozmiar pliku to <strong>${size_max}</strong>!'
	},
	
	flash: {
		hidden: 'Aby włączyć wysyłanie plików, odblokuj go w swojej przeglądarce i odśwież stronę (prawdopodobnie wysyłanie plików jest blokowane przez wtyczkę Adblock).',
		disabled: 'Aby włączyć wysyłanie plików, odblokuj obiekt Flash i odśwież stronę (prawdopodobnie wysyłanie plików blokowane jest przez wtyczkę Flashblock).',
		flash: 'Aby wysyłać pliki na serwer, należy zainstalować w przeglądarce wtyczkę <a href="http://www.adobe.com/shockwave/download/download.cgi?P1_Prod_Version=ShockwaveFlash">Adobe Flash</a>.'
	},
	
	resizeImages: 'Zmniejsz duże obrazy w trakcie wysyłania',

    serialize: 'Zapisz galerię',
    gallery: {
        text: 'Podpis',
        save: 'Zapisz',
        remove: 'Usuń element z galerii',
        drag: 'Przeciągnij tutaj elementy aby utworzyć galerię...'
    }
};