
var appTitle;
var APP_NAME = 'hanging-todo';

var curUser;
var db;

var boards = {};
var boardArray = [];
var curBoard = null;
var settingBoard;
var lastBoard = null;

var workstations = {};
var workstationArray = [];
var curWorkstation = null;
var settingWorkstation;
var lastWorkstation = null;

var workstationButtons = {};

var statusButtons = {};

var selection = null;

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

function CloseWorkstationSelect() {
	curWorkstationDiv.className = '';
	workstationSelectionDiv.hidden = true;
}

function SetClass(els, className) {
	for (var i in els) {
		els[i].className = className;
	}
}

function AddWorkstationButton(id, title) {
	var button = document.createElement('button');
	button.innerText = (title === undefined ? id : title);
	button.onclick = function() {
		selection.doc.ref.set({
			workstation: id,
		}, { merge: true }); // @TODO @low onerror
		button.parentElement.hidden = true;
	};

	workstationButtons[id] = button;

	taskContextMenu.insertBefore(button, taskContextMenu.children[taskContextMenu.children.length - 2]);
}

function SetTaskStatus(task, status) {
	task.doc.ref.set({
		status: status,
	}, { merge: true }); // @TODO @low onerror
}

function ContextMenuInit(el) {
	el.FocusOut = function(e) {
		if (e === null || e.relatedTarget === null || e.relatedTarget.parentElement !== el) {
			el.hidden = true;
			if (lastWorkstation !== null)
				lastWorkstation.el.classList.remove('menuon');
			if (lastBoard !== null)
				lastBoard.el.classList.remove('menuon');
			if (selection !== null) {
				selection.li.classList.remove('selected');
				selection = null;
			}
		}
	};
	el.addEventListener('focusout', el.FocusOut);
}

function ShowContextMenu(el, e) {
	el.style.top = e.y + 'px';
	el.style.left = e.x + 'px';
	el.hidden = false;
	el.focus();
}

function CountTasks(board) {
	var count = 0;
	for (var i = 0; i < board.taskArray.length; i++) {
		var task = board.taskArray[i];
		if (task.status === 1) {
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
	SetSetting('workstation', (workstation === null ? '' : workstation.id));
	curWorkstation = workstation;

	allWorkstationsButton.classList.remove('selected');
	workstationArray.forEach(function(item) {
		item.el.classList.remove('selected');
	});

	if (curWorkstation === null) {
		curWorkstationDiv.innerText = allWorkstationsButton.innerText;
		taskWorkstationSelect.hidden = true;
		allWorkstationsButton.classList.add('selected')
	} else {
		NameWorkstation(workstation);
		taskWorkstationSelect.hidden = false;
		curWorkstationRadio.nextSibling.innerText = curWorkstation.name;
		workstation.el.classList.add('selected');
	}

	CloseWorkstationSelect();
}

function ChangeBoard(thisBoard) {
	if (curBoard === thisBoard) {
		InitRename(thisBoard);
		return;
	}

	SetSetting('board', (thisBoard === null ? '' : thisBoard.doc.id));

	curBoard = thisBoard;

	boardArray.forEach(function(board) {
		board.el.classList.remove('selected');
	});

	thisBoard.el.classList.add('selected');

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
						li: newEl,
						el: document.createElement('span'),
					};

					thisBoard.tasks[doc.id] = task;
					thisBoard.taskArray.push(task);

					var completeButton = document.createElement('button');
					completeButton.innerText = "✓";
					completeButton.onclick = function(e) {
						SetTaskStatus(task, 2);
						e.stopPropagation();
						return false;
					};

					task.el.innerText = task.name;
					newEl.tabIndex = '0';
					newEl.appendChild(completeButton);
					newEl.appendChild(task.el);

					if (task.workstation !== '') {
						var tagEl = document.createElement('i');
						if (workstations.hasOwnProperty(task.workstation)) {
							tagEl.innerText = workstations[task.workstation].name;
							newEl.appendChild(tagEl);
						}
					}

					newEl.onclick = function() {
						if (document.activeElement === task.li && selection === task) {
							task.li.classList.add('selected');
							InitRename(task, function() { task.li.classList.remove('selected'); });
						} else {
							selection = task;
						}
					};
					newEl.oncontextmenu = function(e) {
						deleteTask.onclick = function() {
							task.doc.ref.delete()/*.then(function() {
								//console.log("Document successfully deleted!");
							})*/.catch(function(error) {
								console.error("Error removing document: ", error);
							});
							taskContextMenu.FocusOut(null);
							return false;
						};
						selection = task;
						selection.li.classList.add('selected');

						SetClass(statusButtons, '');
						statusButtons[task.status].className = 'selected';

						SetClass(workstationButtons, '');
						workstationButtons[task.workstation].className = 'selected';

						ShowContextMenu(taskContextMenu, e);
						return false;
					};
					newEl.addEventListener('focusout', function() {
						if (selection !== null && selection.li.classList.contains('selected') === false)
							selection = null;
					});

					if (data.status !== 1
						|| (data.workstation !== ''
							&& (curWorkstation === null
								|| curWorkstation.id !== data.workstation)))
					{
						//task.el.hidden = true;
					} else {
						thisBoard.ul.appendChild(newEl);
					}
				}
				else if (change.type === "modified") {
					//console.log("modified: ", change, change.doc.data());

					var task = thisBoard.tasks[change.doc.id];
					var data = change.doc.data();
					
					if (data.status !== 1) {
						task.li.hidden = true;
					}

					task.name = data.name;
					task.status = data.status;
					task.workstation = data.workstation;

					task.el.innerText = task.name;
				}
				else if (change.type === "removed") {
					var task = thisBoard.tasks[change.doc.id];

					task.li.remove();

					thisBoard.taskArray.splice(thisBoard.taskArray.indexOf(task), 1);
					delete thisBoard.tasks[change.doc.id];

					//console.log("removed: ", change, change.doc.data());
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
}

function InitRename(item, afterFn) {
	//item.el.contentEditable = true;
	item.el.contentEditable = 'plaintext-only';
	item.el.focus();
	item.el.onkeydown = function(e) {
		if (e.keyCode === 13) { // Enter
			this.contentEditable = false;
			item.doc.ref.set({
				name: this.innerText,
			}, {merge: true}); // @TODO @low onerror
			if (afterFn !== undefined)
				afterFn();
			return false;

		} else if (e.keyCode === 27) { // Escape
			this.contentEditable = false;
			this.innerText = item.name;
			if (afterFn !== undefined)
				afterFn();
			return false;
		}
	};
	item.el.onblur = function(e) {
		this.contentEditable = false;
		if (afterFn !== undefined)
			afterFn();
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
					document.getElementById('firebaseui-auth-container').hidden = true;
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

		document.getElementById('firebaseui-auth-container').hidden = false;
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
	settingWorkstation = GetSetting('workstation', '');
	settingBoard = GetSetting('board', '');

	if (settingWorkstation === '')
		ChangeWorkstation(curWorkstation);

	// workstations --------------------------
	db.collection('workstations').where('userid', '==', curUser.uid).onSnapshot(function(snapshot) {
		snapshot.docChanges().forEach(function(change) {
			if (change.type === "added") {
				var doc = change.doc;
				var data = doc.data();
				var newEl = document.createElement('li');
				var newWorkstation = {
					id: doc.id,
					name: data.name,
					doc: doc,
					el: newEl,
				};

				workstations[doc.id] = newWorkstation;
				workstationArray.push(newWorkstation);

				NameWorkstation(newWorkstation);
				
				newEl.onclick = function() {
					if (newWorkstation.el.contentEditable === 'plaintext-only')
						return;
					
					if (newWorkstation === curWorkstation) {
						InitRename(newWorkstation);
						return;
					}
					ChangeWorkstation(newWorkstation);
				};
				newEl.oncontextmenu = function(e) {
					lastWorkstation = newWorkstation;
					newWorkstation.el.classList.add('menuon');

					editWorkstation.onclick = function() {
						InitRename(newWorkstation);
						workstationContextMenu.FocusOut(null);
						return false;
					};
					deleteWorkstation.onclick = function() {
						newWorkstation.doc.ref.delete().then(function() {
							//console.log("Document successfully deleted!");
						}).catch(function(error) {
							console.error("Error removing document: ", error);
						});
						workstationContextMenu.FocusOut(null);
						return false;
					};
					ShowContextMenu(workstationContextMenu, e);
					return false;
				};

				if (settingWorkstation === newWorkstation.id) {
					ChangeWorkstation(newWorkstation);
				}

				AddWorkstationButton(newWorkstation.id, newWorkstation.name);

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
					if (thisBoard.el.contentEditable === 'plaintext-only')
						return;

					ChangeBoard(thisBoard);
				};
				newEl.oncontextmenu = function(e) {
					lastBoard = thisBoard;
					thisBoard.el.classList.add('menuon');

					editBoard.onclick = function() {
						InitRename(thisBoard);
						boardContextMenu.FocusOut(null);
						return false;
					};
					
					deleteBoard.onclick = function() {
						thisBoard.doc.ref.delete().then(function() {
							//console.log("Document successfully deleted!");
						}).catch(function(error) {
							console.error("Error removing document: ", error);
						});
						boardContextMenu.FocusOut(null);
						return false;
					};
					ShowContextMenu(boardContextMenu, e);
					return false;
				};

				boardsUl.appendChild(newEl);

				NameBoard(thisBoard);

				thisBoard.div.hidden = true;
				thisBoard.heading.hidden = true;
				thisBoard.div.appendChild(thisBoard.heading);
				thisBoard.div.appendChild(thisBoard.ul);
				tasksDiv.appendChild(thisBoard.div);

				if (settingBoard === thisBoard.doc.id) {
					ChangeBoard(thisBoard);
				}
			}
			else if (change.type === "modified") {
				var data = change.doc.data();
				var board = boards[change.doc.id];
				board.name = data.name;
				NameBoard(board);
				//console.log("Modified: ", data);
			}
			else if (change.type === "removed") {
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
			status: 1,
		};

		if (curWorkstation !== null && curWorkstationRadio.checked) {
			newData.workstation = curWorkstation.id;
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
};
allWorkstationsButton.oncontextmenu = function() {
	return false;
};

curWorkstationDiv.onclick = function() {
	if (workstationSelectionDiv.hidden) {
		this.className = 'expanded';
		workstationSelectionDiv.hidden = false;
	} else {
		CloseWorkstationSelect();
	}
}

allBoardsButton.oncontextmenu = function() { return false; };

ContextMenuInit(workstationContextMenu);
ContextMenuInit(boardContextMenu);
ContextMenuInit(taskContextMenu);

function CreateStatusButton(status, name) {
	var button = document.createElement('button');
	button.innerText = name;
	button.onclick = function() {
		SetTaskStatus(selection, status);
		button.parentElement.hidden = true;
	};

	statusButtons[status] = button;

	taskContextMenu.insertBefore(button, taskContextMenu.children[taskContextMenu.children.length - 4]);
}

CreateStatusButton(1, "Immediate");
CreateStatusButton(0, "Optional");
CreateStatusButton(2, "Done");
CreateStatusButton(3, "Archive");
CreateStatusButton(-1, "Cancelled");

AddWorkstationButton('', '(any)');

var a = taskWorkstationSelect.getElementsByTagName('input');

for (var i in a) {
	a[i].onchange = function() {
		if (curWorkstationRadio.checked) {
			taskWorkstationSelect.className = '';
		} else {
			taskWorkstationSelect.className = 'default';
		}
	};
}
