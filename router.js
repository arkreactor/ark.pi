module.exports = function(app) {

   app.get('/', function(req,res){
        res.render('index.html');
   });
   app.get('/graph', function(req,res){
        res.render('graph.html');
   });
   app.get('/history', function(req,res){
        res.render('history.html');
   });
   app.get('/livegraph', function(req,res){
        res.render('livegraph.html');
   });


};
