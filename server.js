// express 라이브러리를 사용하겠다는 뜻
const express = require('express');
const app = express();
// Mongodb
const { MongoClient, ObjectId } = require('mongodb');

// passport 라이브러리
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');

app.use(passport.initialize());
app.use(
  session({
    secret: '암호화에 쓸 비밀번호',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.session());

// method-override
const methodOverride = require('method-override');

app.use(methodOverride('_method'));
// css 파일 가져오기
app.use(express.static(__dirname + '/public'));
// ejs 세팅
app.set('view engine', 'ejs');
// 요청.body를 사용하려면 필요한 코드
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// db연결
let db;
const url =
  'mongodb+srv://kang:wldud0709@cluster0.odxrdbm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');
    // 서버 띄우는 코드
    app.listen(8080, () => {
      console.log('http://localhost:8080 에서 서버 실행중');
    });
  })
  .catch((err) => {
    console.log(err);
  });

// 새로운 페이지 생성
app.get('/', (요청, 응답) => {
  응답.sendFile(__dirname + '/index.html');
  // html 파일을 넣어주면 그 파일이 뜬다.
  //__dirname : 현재 파일이 담긴 폴더
});

app.get('/news', (요청, 응답) => {
  db.collection('post').insertOne({ title: '제목' });
  // 응답.send('오늘 비옴');
});

app.get('/shop', (요청, 응답) => {
  응답.send('쇼핑할수있음');
});

app.get('/about', (요청, 응답) => {
  응답.sendFile(__dirname + '/about.html');
});

// DB 가져오기
app.get('/list', async (요청, 응답) => {
  // 컬렉션의 모든 document를 출력하는 방법
  let result = await db.collection('post').find().toArray();
  // db.collection('post').find().toArray().then(()=>{}) 으로 써도 됨

  // console.log(result[0].title);
  // 응답.send(result[0].title);

  // ejs파일 보내는 법
  응답.render('list.ejs', { post: result });
});

app.get('/time', (요청, 응답) => {
  응답.render('time.ejs', { data: new Date() });
});

app.get('/write', (요청, 응답) => {
  응답.render('write.ejs');
});

app.post('/add', async (요청, 응답) => {
  console.log(요청.body);

  // 예외상황 대처
  try {
    if (요청.body.title == '' || 요청.body.content == '') {
      응답.send('올바른 입력이 아닙니다.');
    } else {
      // form에 입력한 데이터 db에 저장하기
      await db
        .collection('post')
        .insertOne({ title: 요청.body.title, content: 요청.body.content });
      응답.redirect('/list');
    }
  } catch (error) {
    console.log(error); // 에러메세지 출력
    응답.status(500).send('에러입니다.');
  }
});

// 상세페이지
app.get('/detail/:id', async (요청, 응답) => {
  // 유저가 이 자리에 아무문자나 입력 할 시 / 이렇게 하면 하드코딩 안해도 됨
  // 예외처리 - 1
  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(요청.params.id) });
  응답.render('detail.ejs', { result: result });
});

// 수정페이지(상세페이지 만들기와 비슷)
app.get('/edit/:id', async (요청, 응답) => {
  let result = await db
    .collection('post')
    .findOne({ _id: new ObjectId(요청.params.id) });
  console.log(result);
  응답.render('edit.ejs', { result: result });
});

app.put('/edit', async (요청, 응답) => {
  //     await db.collection('post').updateOne({ _id : 1},
  //     {$inc : {like : 1}
  //    })

  // db수정
  await db
    .collection('post')
    .updateOne(
      { _id: new ObjectId(요청.body.id) },
      { $set: { title: 요청.body.title, content: 요청.body.content } }
    );
  console.log(요청.body);
  응답.redirect('/list');
});

// app.post('/abc', async(요청,응답)=>{
//     console.log('안녕')
//     console.log(요청.body)
// })

app.get('/abc', async (요청, 응답) => {
  // console.log(요청.params) -> url paramaeter
  console.log(요청.query); // query string
});

// 삭제
app.delete('/delete', async (요청, 응답) => {
  console.log(요청.query);
  await db
    .collection('post')
    .deleteOne({ _id: new ObjectId(요청.query.docid) });
  응답.send('삭제완료');
});

app.get('/list/next/:id', async (요청, 응답) => {
  // 1~5번 글을 찾아서 result 변수에 저장
  let result = await db
    .collection('post')
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  응답.render('list.ejs', { post: result });
});

passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection('user')
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' });
    }
    if (result.password == 입력한비번) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  })
);

app.get('/login', async (요청, 응답) => {
  응답.render('login.ejs');
});

app.post('/login', async (요청, 응답) => {
  // 아이디 비번이 db와 맞는지 비교하는 코드가 실행됨
  passport.authenticate('local', (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(500).json(info.message);
    요청.logIn(user, (err) => {
      // 실행하면 세션을 만들어줌
      if (err) return next(err);
      응답.redirect('/');
    });
  })(요청, 응답, next);
});

// 예외처리 - 2
// try {
// let result = await db.collection('post').findOne({_id : new ObjectId(요청.params.id)});
// console.log(result);
// if(result == null){
//     응답.status(400).send('url 입력 오류');
// }
// 응답.render('detail.ejs', {result : result});
// } catch (error) {
// console.log(error);
// 응답.status(400).send('url 입력 오류');
// }

// (요청, 응답) => {
// 콜백함수 : 다른 함수 파라미터에 들어가는 함수
