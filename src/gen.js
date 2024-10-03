// warning - this is just an innovation time hack - your expectations should be low :-)
//
const fs = require( 'fs' );
const path = require( 'path' );

filename = '*'; 
console.log('file name: ', filename);

const dirname = path.dirname(filename);
console.log('directory name: ', dirname);

const dirContents = fs.readdirSync(dirname);

console.log(dirContents);

jsonfiles = dirContents.filter( (filename) => filename.endsWith( '.json' ) );

console.log( '----' )


const folderName = './templates';
try {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }
} catch (err) {
  console.error(err);
}




function genMenu( role, name, data, active ) {
  var pre = `
    <p class="menu-label">${name}</p>
    <ul class="menu-list"> `;
  var post = `
    </ul>`;

  var item = `<li><a>${text}</a></li>`

  var body = '';

  for (var x in data) {
    var text = data[x].name;
    var item = `
      <li><a href="./${lcns(role)}-${lcns(text)}.html">${text}</a></li> `;

    //if (x == active) {
    if (data[x].name == active) {
      item = `
      <li><a class='is-active'>${text}</a></li> `;
    }

    body = body + item;
  }

  return pre + body + post;
}


function genCard( title, data ) {
  var pre = `
  <div class="card">
    <div class="card-content">
      <div class="media">
        <div class="media-content">
          <p class="title is-4">${title}</p>
        </div>
      </div>
      <div class="content"> `;
  var post = `
        </ul>
      </div>
    </div>
  </div>`;

  var body = '';

  var inside_ul = false;

  for (var text of data) {

    if (text.startsWith( '+' )) {
      var title =`
        <h6 class="title">${text.slice(1)}</h6>`;
      if (inside_ul) {
        body = body + `
        </ul>` + title + `
        <ul>`;
      }
      else {
        body = body + title;
      }
    }
    else {
      var item = `
          <li>${text}</li>`;
      if (!inside_ul) {
        body = body + `
        <ul>`;
        inside_ul = true;
      }
      body = body + item;
    }
  }

  return pre + body + post;
}

// convert string to lowercase with no spaces
//
function lcns( str ) {
  return str.replaceAll( ' ', '' ).toLowerCase();
}

function genPage( json, criteria ) {
  const name = lcns( json.role );
  
  const pre_page = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DDAT Scoring</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css">
  </head>
  <body>
    <section class="section">
      <div class="container">
        <h1 class="title">DDaT Scoring</h1>
        <p class="subtitle">
        Stephen Page
        </p>
        <hr>
        <div class="columns">
`;

  const post_page = `
        </div>
      </div>
    </section>
  </body>
</html>
`;

  const pre_menu = `
  <aside class="menu">
    <p class="menu-label">General</p>
    <ul class="menu-list">
      <li><a>Summary</a></li>
      <li><a>Scores</a></li>
      <li><a>Admin</a></li>
    </ul> `;

  const post_menu = `
    <p class="menu-label">Finalise</p>
    <ul class="menu-list">
      <li><a>Report</a></li>
    </ul>
  </aside>
`;

  var page = 
    pre_page + 
    '<div class="column is-one-third">' + 
    pre_menu + 
    genMenu( json.role, "Skills", json.skills, criteria.name ) +
    genMenu( json.role, "Behaviours", json.behaviours, criteria.name ) +
    post_menu +
    '</div>' + 
    '<div class="column">' + 
    genCard( criteria.name, criteria.description ) +
    genCard( 'Suggested Sources of Evidence', criteria.evidence ) +
    '</div>' + 
    post_page;

  const filename = './templates/' + name + '-' + lcns(criteria.name) + '.html';
  console.log( 'generating ' + filename );
  fs.writeFileSync( filename, page );
}

function genPagesForRole( json ) {
  for (var x in json.skills) {
    genPage( json, json.skills[x] )
  }
  for (var x in json.behaviours) {
    genPage( json, json.behaviours[x] )
  }
}

for (var i in jsonfiles) {
  console.log( jsonfiles[i] )
  try {
    var json = require( "./" + jsonfiles[i] );
    console.log( json );
    
    for (var x in json.skills) {
      console.log( json.skills[x].name )
    }
    for (var x in json.behaviours) {
      console.log( json.behaviours[x].name )
    }

    //genPage( json, json.skills[0] )
    //genPage( json, json.behaviours[1] )

    genPagesForRole( json )

//    console.log( genMenu( "Skills", json.skills, 1 ) );
//    console.log( genMenu( "Behaviours", json.behaviours ) );
//    console.log( genCard( json.skills[0].name, json.skills[0].description ) );
//    console.log( genCard( 'Suggested Sources of Evidence', json.skills[0].evidence ) );
  }
  catch( e ) {
    console.log( `${e.name} : ${e.message}` )
    console.log( e )
  }
}

console.log( 'done' );


