const fs = require('fs');
const qs = require('querystring');
const utils = require('./utils.js');
const User = require('./lib/user.js');
const displayLib = require('./lib/displayLib.js');
const _registeredUsers=[{userName:'pranavb', name:'pranavb', password:'password'}, {userName:'sree',name:'sreenadh',password:"password"}];

let data = {};
let pranavb = new User('pranavb');
data['pranavb'] = pranavb;
let sree = new User('sree');
data['sree'] = sree;


const serve404=(req,res)=>{
  res.statusCode = 404;
  res.setHeader('Content-Type','text/html');
  res.write(fs.readFileSync('./public/fileNotFound.html'));
  res.end();
  return ;
};

const toS = o=>JSON.stringify(o,null,2);

//==========================================================================

const deleteToDo=(req,res)=>{
  let currUser = data[`${req.user.userName}`];
  currUser.deleteToDo(`${req.cookies.currentToDo}`)
  res.redirect('/home.html')
};

const serveStaticPage=function (req,res) {
  if (!req.user) {
    res.redirect('/login.html')
    return ;
  }
  let resourcePath=`./public${req.url}`;
  try {
    let filecontent=fs.readFileSync(resourcePath);
    res.statusCode=200;
    res.write(filecontent);
    res.end();
    return ;
  } catch (e) {
    serve404(req,res);
    return;
  }
};

const showSingleToDo=(req,res)=>{
  let currUser = data[`${req.user.userName}`];
  let currToDo = currUser.getToDo(`${req.cookies.currentToDo}`)
  let toDoPage = fs.readFileSync('./public/showSingleToDo.html','utf8');
  toDoPage = toDoPage.replace('<toDoTitle></toDoTitle>',currToDo.getTitle());
  toDoPage = toDoPage.replace('<toDoDesc></toDoDesc>',currToDo.getDesc());
  let itemList = `<ul>${currToDo.mapItems(displayLib.toItemList)}</ul>`;
  toDoPage = toDoPage.replace('<allItems></allItems>',itemList);
  res.write(toDoPage);
  res.end();
};

const addNewTodo=(req,res)=>{
  let userName=req.user.userName;
  let currUser = data[`${userName}`];
  let title = req.body.title;
  let description = req.body.description;
  currUser.addToDo(title,description);
  res.redirect('/home.html')
};

const logRequest = (req,res)=>{
  let text = ['------------------------------',
    `${utils.timeStamp()}`,
    `${req.method} ${req.url}`,
    `HEADERS=> ${toS(req.headers)}`,
    `COOKIES=> ${toS(req.cookies)}`,
    `BODY=> ${toS(req.body)}`,''].join('\n');
  fs.appendFile('./request.log',text,()=>{});

  console.log(`${req.method} ${req.url}`);
};

const loadUser = (req,res)=>{
  let sessionid = req.cookies.sessionid;
  let user = _registeredUsers.find(u=>u.sessionid==sessionid);
  if(sessionid && user){
    req.user = user;
  }
};

const verifyLogin=(req,res)=>{
  let user = _registeredUsers.find(u=>u.userName==req.body.userName&&u.password==req.body.password);
  if(!user) {
    res.setHeader('Set-Cookie',`message=Login Failed; Max-Age=5`);
    res.redirect('/login.html');
    return;
  }
  let sessionid = process.env.sessionid ||new Date().getTime();
  res.setHeader('Set-Cookie',`sessionid=${sessionid}`);
  user.sessionid = sessionid;
  res.redirect('/home.html');
};

const serveHomePage=(req,res)=>{
  let homePage = fs.readFileSync('./public/home.html','utf8');
  let currUser = data[`${req.user.userName}`];
  res.setHeader('Content-Type','text/html');
  res.statusCode = 200;
  homePage = homePage.replace('<userName></userName>',req.user['name']);
  homePage = homePage.replace('<allToDoTitles></allToDoTitles>',currUser.getToDoTitlesInHtmlList('/showSingleToDo'));
  res.write(homePage);
  res.end();
}

const serveLoginPage=(req,res)=>{
  res.setHeader('Content-Type','text/html');
  res.write(`<h1>Login</h1>`);
  res.write(`<p>${req.cookies.message||""}</p>`);
  res.write(fs.readFileSync("./public/login.html"));
  res.end();
};

const logoutUser=(req,res)=>{
  res.setHeader('Set-Cookie',`sessionid=0`);
  if (req.user) {
    delete req.user.sessionid;
  }
  res.redirect('/login.html');
};

const addNewItem=(req,res)=>{
  let currUser = data[`${req.user.userName}`];
  let currToDoTitle = req.cookies.currentToDo;
  currUser.addItemTo(currToDoTitle,req.body.item);
  res.redirect('/showSingleToDo');
};

const redirectLoggedInUserToHome = (req,res)=>{
  if(req.urlIsOneOf(['/','/login.html']) && req.user) {
    res.redirect('/home.html');
  }
};

const redirectLoggedOutUserToLogin = (req,res)=>{
  let urlAllowedForOnlyLoggedIn = ['/', '/addNewTodo.html', '/addToToDoList.html', '/editAll.html', '/home.html', 'showSingleToDo.html', '/viewAll.html', '/deleteToDo', '/showSingleToDo', '/addNewTodo', '/addNewItem', '/edit'];
  if(req.urlIsOneOf(urlAllowedForOnlyLoggedIn) && !req.user) {
    res.redirect('/login.html');
  }
};

const deleteItemAndGetUpdatedList = (req,res)=>{
  let currentToDo = req.cookies.currentToDo;
  let currUser = data[`${req.user.userName}`];
  currUser.deleteItemOf(currentToDo,req.body['item']);
  currTodo = currUser.getToDo(currentToDo);
  updatedItemList = currTodo.getItemsDescInList();
  res.write(JSON.stringify(updatedItemList));
  res.end();
};

const updateItemStatus = (req,res)=>{
  let item = req.body.item;
  let checkedStatus = req.body.itemStatus;
  let currUser = data[`${req.user.userName}`];
  let currToDo = currUser.getToDo(`${req.cookies.currentToDo}`);
  if(checkedStatus=="true") {
    currUser.checkItemOf(currToDo.getTitle(),item);
  }
  else {
    currUser.uncheckItemOf(currToDo.getTitle(),item);
  }
  let updatedItem = currToDo.getItemByDesc(item);
  res.write(JSON.stringify(updatedItem))
  res.end();
}

module.exports={
  deleteToDo,
  serveStaticPage,
  showSingleToDo,
  addNewTodo,
  logRequest,
  loadUser,
  verifyLogin,
  serveLoginPage,
  logoutUser,
  addNewItem,
  redirectLoggedOutUserToLogin,
  redirectLoggedInUserToHome,
  serveHomePage,
  deleteItemAndGetUpdatedList,
  updateItemStatus
}
