
var appTitle;
var APP_NAME = 'hanging-todo';

var curUser;
var db;

var boards = {};
var boardArray = [];
var curBoard = null;

var workstations = {};
var workstationArray = [];
var curWorkstation = null;
var settingWorkstation;

var config = {
	apiKey: 'AIzaSyBPe-tuk-D9VeigholrdFkRdJ8sxe72zaY',
	authDomain: 'hanging-todo.firebaseapp.com',
	projectId: 'hanging-todo',
	//databaseURL: "https://hanging-todo.firebaseio.com",
	//storageBucket: "hanging-todo.appspot.com",
	//messagingSenderId: "<SENDER_ID>",
};



function GetSetting(setting, defaultValue) {
	var value = localStorage.getItem(APP_NAME + setting);
	if (value === null) {
		return defaultValue;
	} else {
		return value;
	}
}

function SetSetting(setting, value) {
	localStorage.setItem(APP_NAME + setting, value);
}

function CountTasks(board) {
	var count = 0;
	for (var i = 0; i < board.taskArray.length; i++) {
		var task = board.taskArray[i];
		if (task.status === 0) {
			count++;
		}
	}

	if (count > 0) {
		document.title = "(" + count + ") " + appTitle;
	} else {
		document.title = appTitle;
	}
}

function NameBoard(board) {
	board.el.innerText = board.name;
	board.heading.innerText = board.name;
}

function NameWorkstation(workstation) {
	workstation.el.innerText = workstation.name;
	if (curWorkstation === workstation)
		curWorkstationDiv.innerText = curWorkstation.name;
}

function ChangeWorkstation(workstation) {
	SetSetting('workstation', (workstation === null ? null : workstation.name));
	curWorkstation = workstation;
	if (curWorkstation === null) {
		curWorkstationDiv.innerText = allWorkstationsButton.innerText;
		taskWorkstationSelect.hidden = true;
	} else {
		NameWorkstation(workstation);
		taskWorkstationSelect.hidden = false;
		curWorkstationRadio.nextSibling.innerText = curWorkstation.name;
	}
	workstationSelectionDiv.hidden = true;
}

function InitRename(item) {
	//item.el.contentEditable = true;
	item.el.contentEditable = 'plaintext-only';
	item.el.focus();
	item.el.onkeydown = function(e) {
		if (e.keyCode === 13) { // Enter
			this.contentEditable = false;
			item.doc.ref.set({
				name: this.innerText,
			}, {merge: true}); // @TODO @low onerror

		} else if (e.keyCode === 27) { // Escape
			this.contentEditable = false;
			this.innerText = item.name;
			return false;
		}
	};
	item.el.onblur = function(e) {
		this.contentEditable = false;
	};
}



appTitle = document.title;

firebase.initializeApp(config);

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		curUser = user;
		userImg.src = curUser.photoURL;
		loaderDiv.hidden = true;
		mainDiv.hidden = false;

	} else {

		mainDiv.hidden = true;
		
		var ui = new firebaseui.auth.AuthUI(firebase.auth());

		var uiConfig = {
			callbacks: {
				signInSuccess: function(currentUser, credential, redirectUrl) {
					return true; // @TODO wat does this do??
				},
				uiShown: function() {
					loaderDiv.style.display = 'none';
				}
			},
			signInFlow: 'popup',
			signInSuccessUrl: '/hanging-todo/', // @TODO?
			signInOptions: [
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
			],
			tosUrl: '/hanging-todo/tos' // @TODO
		};

		ui.start('#firebaseui-auth-container', uiConfig); // The start method will wait until the DOM is loaded.
		
	}
});

db = firebase.firestore();
db.settings({timestampsInSnapshots: true});

db.enablePersistence()
	.then(function() {
		Go();
	})
	.catch(function(err) {
		if (err.code == 'failed-precondition') {
			console.error("Multiple tabs open, persistence can only be enabled in one tab at a a time."); // @TODO
		} else if (err.code == 'unimplemented') {
			console.error("The current browser does not support all of the features required to enable persistence."); // @TODO
		}
	});

function Go() {
	settingWorkstation = GetSetting('workstation', null);

	if (settingWorkstation === null)
		ChangeWorkstation(curWorkstation);

	// workstations --------------------------
	db.collection('workstations').where('userid', '==', curUser.uid).onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();
				var newEl = document.createElement('li');
				var newWorkstation = {
					name: data.name,
					doc: doc,
					el: newEl,
				};

				workstations[doc.id] = newWorkstation;
				workstationArray.push(newWorkstation);

				NameWorkstation(newWorkstation);
				
				newEl.onclick = function() {
					if (newWorkstation === curWorkstation) {
						InitRename(newWorkstation);
						return;
					}
					ChangeWorkstation(newWorkstation);
				};
				newEl.oncontextmenu = function(e) {
					deleteWorkstation.onclick = function() {
						newWorkstation.doc.ref.delete().then(function() {
							//console.log("Document successfully deleted!");
						}).catch(function(error) {
							console.error("Error removing document: ", error);
						});
						WorkstationContextMenuFocusOut(null);
						return false;
					};
					workstationContextMenu.hidden = false;
					workstationContextMenu.focus();
					return false;
				};

				if (settingWorkstation === newWorkstation.name) {
					ChangeWorkstation(newWorkstation);
				}

				workstationsUl.appendChild(newEl);
			}
			else if (change.type === "modified") {
				var data = change.doc.data();
				var workstation = workstations[change.doc.id];
				workstation.name = data.name;
				NameWorkstation(workstation);
				
				//console.log("Modified: ", data);
			}
			else if (change.type === "removed") {
				var data = change.doc.data();
				var workstation = workstations[change.doc.id];

				if (curWorkstation === workstation) {
					ChangeWorkstation(null);
				}

				workstation.el.remove();

				workstationArray.splice(workstationArray.indexOf(workstation), 1);
				delete workstations[change.doc.id];

				//console.log("Removed: ", change.doc.data());
			}
		});
	}, function(error) {
		console.error('workstations:', error); // @TODO
	});

	// boards --------------------------
	db.collection('boards').where('userid', '==', curUser.uid).onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();
				var newEl = document.createElement('li');
				var thisBoard = {
					name: data.name,
					doc: doc,
					el: newEl,
					subscription: null,
					div: document.createElement('div'),
					heading: document.createElement('h2'),
					ul: document.createElement('ul'),
					tasks: {},
					taskArray: [],
				};

				boards[doc.id] = thisBoard;
				boardArray.push(thisBoard);

				newEl.onclick = function() {
					if (curBoard === thisBoard) {
						InitRename(thisBoard);
						return;
					}

					curBoard = thisBoard;

					boardArray.forEach(function(board) {
						board.el.classList.remove('selected');
					});

					newEl.classList.add('selected');

					if (curBoard.subscription === null) {
							curBoard.subscription = curBoard.doc.ref.collection('tasks').onSnapshot(function(snapshot) {
							snapshot.docChanges().forEach(function(change) {
								if (change.type === "added") {
									var doc = change.doc;
									var data = doc.data();
									var newEl = document.createElement('li');
									var task = {
										name: data.name,
										workstation: data.workstation,
										status: data.status,
										doc: doc,
										el: newEl,
									};

									thisBoard.tasks[doc.id] = task;
									thisBoard.taskArray.push(task);

									var completeButton = document.createElement('button');
									completeButton.innerText = 'Complete';
									completeButton.onclick = function() {
										task.doc.ref.set({
											status: 1,
										}, { merge: true });
									};

									var text = document.createTextNode(task.name);
									newEl.appendChild(completeButton);
									newEl.appendChild(text);

									if (data.status === 1) {
										//task.el.hidden = true;
									} else {
										thisBoard.ul.appendChild(newEl);
									}
								}
								else if (change.type === "modified") {
									console.log("modified: ", change, change.doc.data());

									var task = thisBoard.tasks[change.doc.id];
									var data = change.doc.data();
									
									if (data.status === 1) {
										task.el.hidden = true;
									}

									task.name = data.name;
									task.status = data.status;
								}
								else if (change.type === "removed") {
									// @TODO
									console.log("removed: ", change, change.doc.data());
								}
							});

							CountTasks(curBoard);
						}, function(error) {
							console.error('boards:', error); // @TODO
						});
					}

					boardArray.forEach(function(board) {
						board.div.hidden = true;
					});

					thisBoard.div.hidden = false;

					tasksDiv.hidden = false;

					CountTasks(curBoard);
				};
				newEl.oncontextmenu = function(e) {
					deleteBoard.onclick = function() {
						thisBoard.doc.ref.delete().then(function() {
							//console.log("Document successfully deleted!");
						}).catch(function(error) {
							console.error("Error removing document: ", error);
						});
						boardContextMenuFocusOut(null);
						return false;
					};
					boardContextMenu.hidden = false;
					boardContextMenu.focus();
					return false;
				};

				boardsUl.appendChild(newEl);

				NameBoard(thisBoard);

				thisBoard.div.hidden = true;
				thisBoard.div.appendChild(thisBoard.heading);
				thisBoard.div.appendChild(thisBoard.ul);
				tasksDiv.appendChild(thisBoard.div);
			}
			else if (change.type === "modified") {
				var data = change.doc.data();
				var board = boards[change.doc.id];
				board.name = data.name;
				NameBoard(board);
				//console.log("Modified: ", data);
			}
			else if (change.type === "removed") {
				var data = change.doc.data();
				var board = boards[change.doc.id];

				board.el.remove();
				board.div.remove();

				if (board.subscription !== null)
					board.subscription(); // unsubscribe

				// @TODO if board is selected

				boardArray.splice(boardArray.indexOf(board), 1);
				delete boards[change.doc.id];

				//console.log("Removed: ", change.doc.data());
			}
		});
	}, function(error) {
		console.error('boards:', error); // @TODO
	});
}

newWorkstationInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
		db.collection('workstations').add({
			name: newName,
			userid: curUser.uid,
		})
		.then(function(docRef) {
			//console.log(docRef);
		});
	}
};

newBoardInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';
		db.collection('boards').add({
				name: newName,
				userid: curUser.uid,
			})
			.then(function(docRef) {
				//console.log(docRef);
			});
	}
};

addTaskInput.onkeypress = function(e) {
	if (e.keyCode === 13) {
		var newName = this.value;
		this.value = '';

		var newData = {
			name: newName,
			workstation: '',
			status: 0,
		};

		if (curWorkstation !== null && curWorkstationRadio.checked) {
			newData.workstation = curWorkstation.name;
		}

		curBoard.doc.ref.collection('tasks').add(newData)
			.then(function(docRef) {
				//console.log(docRef);
			})
			.catch(function(error) {
				console.error("Error writing document: ", error);
			});
	}
};

logoutButton.onclick = function() {
	firebase.auth().signOut().then(function() {
		
	}, function(error) {
		console.error('signOut', error);
	});
};

allWorkstationsButton.onclick = function() {
	ChangeWorkstation(null);
}

curWorkstationDiv.onclick = function() {
	if (workstationSelectionDiv.hidden) {
		workstationSelectionDiv.hidden = false;
	} else {
		workstationSelectionDiv.hidden = true;
	}
}

function WorkstationContextMenuFocusOut(e) {
	if (e === null || e.relatedTarget === null || e.relatedTarget.parentElement !== workstationContextMenu) {
		workstationContextMenu.hidden = true;
	}
}

workstationContextMenu.addEventListener('focusout', WorkstationContextMenuFocusOut);


function boardContextMenuFocusOut(e) { // @TODO @cleanup duplicate code
	if (e === null || e.relatedTarget === null || e.relatedTarget.parentElement !== boardContextMenu) {
		boardContextMenu.hidden = true;
	}
}

boardContextMenu.addEventListener('focusout', boardContextMenuFocusOut);
