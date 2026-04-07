const bcrypt = require("bcryptjs");

const password = "Milongas666?";
const hash = "$2b$10$jve/qTfnNCayov92l7Ny9exLt2tPNbbaOYmmGmraC2Q/81KVAFdwq";

const ok = bcrypt.compareSync(password, hash);
console.log("¿Coincide?:", ok);
