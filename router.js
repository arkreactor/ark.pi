module.exports = function(app) {

   app.get('/', function(req,res){
        res.render('index.html');
   });
   app.get('/graph', function(req,res){
        res.render('d3.html');
   });


};
