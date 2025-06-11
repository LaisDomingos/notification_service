const mongoose = require("mongoose");

const connectToDatabase = async () => {
  try {
    const dbURI = process.env.MONGODB_URI;
    await mongoose.connect(dbURI);
    console.log("Conectado ao MongoDB com sucesso!");
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectToDatabase;
