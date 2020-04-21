const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const app = express();

const mysql = require("mysql");
var conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    port: '3306',
    database: 'minggu7_soa_senin'
})
conn.connect((err)=>{
    if(err) throw err;
})

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(morgan('dev', { stream: accessLogStream }));

app.use(express.urlencoded({extended:true}));
app.use(express.json());

app.post('/api/registerUser', function(req, res){
    var email = req.body.email_user;
    var nama = req.body.nama_user;
    var tipe = 0;
    var password = req.body.password_user;
    var saldo = 0;
    if(req.body.saldo_user != undefined){
        saldo = req.body.saldo_user
    }
    if(req.body.tipe_user != undefined){
        tipe = req.body.tipe_user;
    }
    if(email == "" || nama == "" || password == ""){
        return res.status(400).send("Tidak boleh ada field kosong");
    }
    var query = `select * from user where email_user = '${email}'`;
    conn.query(query,(err,rows,fields)=>{
        if(rows.length > 0){
            return res.status(400).send("Email sudah terdaftar");
        }
        var api_key = "";
        for(var i = 0;i<10;i++){
            api_key = api_key + Math.floor(Math.random() * Math.floor(9));
        }
        query = `select * from user`;
        var counterSama = false;
        conn.query(query,(err,rows,fields)=>{
            console.log("asd");
            rows.forEach(element => {
                if(element.api_key == api_key){
                    counterSama = true;
                }
            });
            if(counterSama == false){
                query = `insert into user values('${email}','${password}','${nama}',${saldo},'${api_key}',${tipe})`;
                conn.query(query,(err,rows,fields)=>{
                    res.status(200).send(api_key);
                })
            }
        })
    })
});

app.post('/api/topup',function(req,res){
    var email = req.body.email_user;
    var saldo = req.body.nominal_topup;
    var query = `select * from user where email_user = '${email}'`;
    conn.query(query,(err,rows,fields)=>{
        if(rows.length <= 0){
            return res.status(400).send("Email tidak terdaftar");
        }
        saldo = parseInt(rows[0].saldo_user) + parseInt(saldo);
        query = `update user set saldo_user = ${saldo} where email_user = '${email}'`;
        conn.query(query,(err,rows,fields)=>{
            return res.status(200).send(saldo+"");
        })
    })
})

app.post('/api/subscribeAPI',function(req,res){
    var email = req.body.email_user;
    var query = `select * from user where email_user = '${email}'`
    conn.query(query,(err,rows,fields)=>{
        if(rows.length <= 0){
            return res.status(400).send("Email tidak terdaftar");
        }
        if(rows[0].tipe_user == 1){
            return res.status(400).send("Email tersebut sudah premium user");
        }
        var saldo = parseInt(rows[0].saldo_user) - 150000;
        if(saldo >= 0){
            query = `update user set tipe_user = 1, saldo_user = ${saldo} where email_user = '${email}'`;
            conn.query(query,(err,rows,fields)=>{
                res.status(200).send("Berhasil subscribe");
            })
        }else{
            return res.status(400).send("Saldo anda kurang");
        }
    })
})
app.post('/api/addLaporan',function(req,res){
    var judul = req.body.judul_laporan;
    var jenis = req.body.jenis_laporan;
    var deskripsi = req.body.deskripsi_laporan;
    var jenisb = req.body.jenis_barang;
    var alamat = req.body.alamat_kehilangan;
    var tanggal = req.body.tanggal_laporan;
    var kode = req.body.kode_pos_alamat;
    var email = req.body.email_pelapor;
    var apikey = req.body.api_key;
    var query = `select * from user where email_user ='${email}' and api_key = '${apikey}'`;
    conn.query(query,(err,rows,fields)=>{
        if(rows.length <= 0){
            return res.status(400).send("Email atau Api Key tidak terdaftar");
        }
        query = `insert into laporan_lostfound values('','${judul}','${jenis}','${deskripsi}','${jenisb}','${alamat}','${tanggal}'
        ,'${kode}','${email}')`;
        console.log(query);
        conn.query(query,(err,rows,fields)=>{
            res.status(200).send("Berhasil tambah laporan");
        })
    })
})

app.get('/api/getKelurahan',function(req,res){
    if(req.query.apiKey == undefined){
        return res.status(400).send("Api Key harus ada");
    }
    var apikey = req.query.apiKey;
    var query = `select * from user where api_key = '${apikey}'`;
    console.log(query);
    conn.query(query,(err,rows,fields)=>{
        if(rows.length <= 0){
            return res.status(400).send("Api Key tidak terdaftar");
        }
        query = `select * from kelurahan`;
        var counter = 0;
        if(req.query.zip_kode != undefined){
            query = query + ` where kode_pos = '${req.query.zip_kode}'`;
            counter++;
        }
        if(req.query.nama_kecamatan != undefined){
            if(counter == 0){
                query = query + ` where `;
            }
            query = query + ` kecamatan = '${req.query.nama_kecamatan}'`;
            counter++;
        }
        console.log(query);
        conn.query(query,(err,rows,fields)=>{
            if(rows.length <= 0){
                return res.status(400).send("Tidak ada keluarahan yang ditemukan");
            }
            res.status(200).send(rows);
        })
    })
})
app.get('/api/searchLaporan',function(req,res){
    if(req.query.apiKey == undefined){
        return res.status(400).send("Api Key harus ada");
    }
    var apikey = req.query.apiKey;
    var query = `select * from user where api_key = '${apikey}'`;
    conn.query(query,(err,rows,fields)=>{
        if(rows.length <= 0){
            return res.status(400).send("Api Key tidak terdaftar");
        }
        if(rows[0].tipe_user == 0){
            return res.status(400).send("User biasa tidak dapat mengakses ini");
        }
        query = `select * from laporan_lostfound`;
        var counter = 0;
        if(req.query.jenis_laporan != undefined){
            query = query + ` where jenis_laporan = '${req.query.jenis_laporan}'`;
            counter++;
        }
        if(req.query.zip_code != undefined){
            if(counter == 0){
                query = query + ` where `;
            }
            query = query + ` kode_pos_alamat = '${req.query.zip_code}'`;
            counter++;
        }
        if(req.query.jenis_barang != undefined){
            if(counter == 0){
                query = query + ` where `;
            }
            query = query + ` jenis_barang = '${req.query.jenis_barang}'`;
            counter++;
        }
        conn.query(query,(err,rows,fields)=>{
            if(rows.length <= 0){
                return res.status(400).send("Tidak ada laporan ditemukan");
            }
            res.status(200).send(rows);
        })
    })
})
const port = process.env.port || 3000;
app.listen(port);
console.log('server listening port'+port+'...');