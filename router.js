module.exports = function(app) {

   app.get('/', function(req,res){
        res.render('index.html');
   });
   app.get('/graph', function(req,res){
        res.render('graph.html');
   });
   app.get('/amchart', function(req,res){
        res.render('amchart.html');
   });


};
