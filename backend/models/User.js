/**
 * @file models/User.js
 * @description Modelo de usuário simulado em memória para o backend.
 * Em uma aplicação real, este módulo interagiria com um banco de dados (e.g., MongoDB, PostgreSQL).
 * Aqui, usamos um array simples para armazenar usuários e simular operações CRUD.
 * 
 * @author Manus AI
 * @date Oct 01, 2025
 */

// Importa a biblioteca bcrypt para hash de senhas
const bcrypt = require("bcryptjs");

// ===================================================================
// SIMULAÇÃO DE BANCO DE DADOS EM MEMÓRIA
// ===================================================================

/**
 * @private
 * @type {Array<Object>}
 * @description Array que simula uma coleção de usuários em um banco de dados.
 * Cada objeto no array representa um usuário.
 */
let users = [];

/**
 * @private
 * @type {number}
 * @description Contador para gerar IDs únicos para novos usuários.
 */
let nextId = 1;

// ===================================================================
// FUNÇÕES AUXILIARES
// ===================================================================

/**
 * @function hashPassword
 * @description Gera um hash seguro para a senha fornecida.
 * Usa `bcrypt.hash` com um `salt` de 10 rounds para segurança.
 * @param {string} password - A senha em texto puro a ser hashed.
 * @returns {Promise<string>} Uma Promise que resolve com o hash da senha.
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * @function comparePassword
 * @description Compara uma senha em texto puro com um hash de senha.
 * @param {string} candidatePassword - A senha em texto puro fornecida pelo usuário.
 * @param {string} hash - O hash da senha armazenado.
 * @returns {Promise<boolean>} Uma Promise que resolve com `true` se as senhas coincidirem, `false` caso contrário.
 */
async function comparePassword(candidatePassword, hash) {
  return bcrypt.compare(candidatePassword, hash);
}

// ===================================================================
// MÉTODOS DO MODELO DE USUÁRIO
// ===================================================================

/**
 * @class User
 * @description Classe que representa o modelo de usuário e suas operações.
 * Contém métodos estáticos para interagir com a coleção de usuários simulada.
 */
class User {
  /**
   * @constructor
   * @description Construtor para criar uma nova instância de usuário.
   * @param {object} data - Objeto contendo os dados do usuário.
   * @param {string} data.email - O endereço de e-mail do usuário (único).
   * @param {string} [data.password] - A senha do usuário (será hashed se fornecida).
   * @param {string} [data.name] - O nome completo do usuário.
   * @param {string} [data.googleId] - O ID do Google se o usuário se registrou via Google OAuth.
   * @param {string} [data.picture] - URL da imagem de perfil do usuário.
   * @param {boolean} [data.isEmailVerified=false] - Indica se o e-mail do usuário foi verificado.
   * @param {string} [data.authProvider=\'local\'] - O provedor de autenticação (e.g., \'local\', \'google\').
   */
  constructor({ email, password, name, googleId, picture, isEmailVerified = false, authProvider = "local" }) {
    this.id = nextId++; // Atribui um ID único
    this.email = email;
    this.password = password; // Senha já deve vir hashed ou será hashed no método create
    this.name = name || email.split("@")[0]; // Nome padrão se não fornecido
    this.googleId = googleId || null;
    this.picture = picture || null;
    this.isEmailVerified = isEmailVerified;
    this.authProvider = authProvider;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * @static
   * @function create
   * @description Cria um novo usuário e o adiciona à coleção.
   * Hashes a senha antes de armazenar o usuário.
   * @param {object} userData - Dados do novo usuário.
   * @returns {Promise<User>} Uma Promise que resolve com o objeto do usuário criado.
   * @throws {Error} Se um usuário com o mesmo e-mail já existir.
   */
  static async create(userData) {
    // Verifica se o e-mail já está em uso
    if (await User.findByEmail(userData.email)) {
      throw new Error("E-mail já registrado.");
    }

    // Hashes a senha se for um registro local
    if (userData.password) {
      userData.password = await hashPassword(userData.password);
    }

    const newUser = new User(userData);
    users.push(newUser);
    console.log("👤 Novo usuário criado:", newUser.email);
    return newUser;
  }

  /**
   * @static
   * @function findById
   * @description Encontra um usuário pelo seu ID.
   * @param {number} id - O ID do usuário.
   * @returns {Promise<User|undefined>} Uma Promise que resolve com o objeto do usuário ou `undefined` se não encontrado.
   */
  static async findById(id) {
    return users.find((user) => user.id === id);
  }

  /**
   * @static
   * @function findByEmail
   * @description Encontra um usuário pelo seu endereço de e-mail.
   * @param {string} email - O endereço de e-mail do usuário.
   * @returns {Promise<User|undefined>} Uma Promise que resolve com o objeto do usuário ou `undefined` se não encontrado.
   */
  static async findByEmail(email) {
    return users.find((user) => user.email === email);
  }

  /**
   * @static
   * @function findByGoogleId
   * @description Encontra um usuário pelo seu ID do Google.
   * @param {string} googleId - O ID do Google do usuário.
   * @returns {Promise<User|undefined>} Uma Promise que resolve com o objeto do usuário ou `undefined` se não encontrado.
   */
  static async findByGoogleId(googleId) {
    return users.find((user) => user.googleId === googleId);
  }

  /**
   * @static
   * @function updateGoogleData
   * @description Atualiza os dados do Google para um usuário existente.
   * Usado para vincular uma conta local a um ID do Google.
   * @param {number} userId - O ID do usuário a ser atualizado.
   * @param {object} googleData - Os dados do Google a serem adicionados/atualizados.
   * @returns {Promise<User|undefined>} Uma Promise que resolve com o objeto do usuário atualizado ou `undefined` se não encontrado.
   */
  static async updateGoogleData(userId, googleData) {
    const userIndex = users.findIndex((user) => user.id === userId);
    if (userIndex > -1) {
      users[userIndex] = {
        ...users[userIndex],
        ...googleData,
        updatedAt: new Date(),
      };
      console.log("🔄 Dados do Google atualizados para usuário:", users[userIndex].email);
      return users[userIndex];
    }
    return undefined;
  }

  /**
   * @static
   * @function update
   * @description Atualiza os dados de um usuário existente.
   * @param {number} id - O ID do usuário a ser atualizado.
   * @param {object} updates - Objeto contendo os campos a serem atualizados.
   * @returns {Promise<User|undefined>} Uma Promise que resolve com o objeto do usuário atualizado ou `undefined` se não encontrado.
   */
  static async update(id, updates) {
    const userIndex = users.findIndex((user) => user.id === id);
    if (userIndex > -1) {
      // Se a senha for atualizada, ela deve ser hashed
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date() };
      console.log("🔄 Usuário atualizado:", users[userIndex].email);
      return users[userIndex];
    }
    return undefined;
  }

  /**
   * @static
   * @function delete
   * @description Remove um usuário da coleção pelo seu ID.
   * @param {number} id - O ID do usuário a ser removido.
   * @returns {Promise<boolean>} Uma Promise que resolve com `true` se o usuário foi removido, `false` caso contrário.
   */
  static async delete(id) {
    const initialLength = users.length;
    users = users.filter((user) => user.id !== id);
    if (users.length < initialLength) {
      console.log("🗑️ Usuário excluído com ID:", id);
      return true;
    }
    return false;
  }

  /**
   * @static
   * @function comparePassword
   * @description Wrapper para a função `comparePassword` para ser usada diretamente no modelo.
   * @param {string} candidatePassword - A senha em texto puro.
   * @param {string} hash - O hash da senha armazenado.
   * @returns {Promise<boolean>} Resultado da comparação.
   */
  static async comparePassword(candidatePassword, hash) {
    return comparePassword(candidatePassword, hash);
  }

  /**
   * @static
   * @function getAllUsers
   * @description Retorna todos os usuários na coleção (apenas para fins de desenvolvimento/teste).
   * Em produção, esta função deve ser usada com cautela ou removida.
   * @returns {Promise<Array<User>>} Uma Promise que resolve com um array de todos os usuários.
   */
  static async getAllUsers() {
    return users;
  }

  /**
   * @function toJSON
   * @description Retorna uma representação JSON do usuário, excluindo campos sensíveis como a senha.
   * @returns {object} Um objeto com os dados do usuário, sem a senha.
   */
  toJSON() {
    const userObject = { ...this };
    delete userObject.password; // Remove a senha antes de retornar o objeto
    return userObject;
  }
}

// ===================================================================
// EXPORTAÇÃO DO MODELO
// ===================================================================

module.exports = User;

// ===================================================================
// DADOS DE EXEMPLO (PARA DESENVOLVIMENTO)
// ===================================================================

/**
 * @function createSampleUsers
 * @description Função assíncrona para criar usuários de exemplo no ambiente de desenvolvimento.
 * Isso facilita o teste da aplicação sem a necessidade de um banco de dados persistente.
 * Os usuários são criados apenas se ainda não existirem.
 */
(async () => {
  // Cria um usuário de exemplo para login local (email/senha)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const adminUser = await User.create({
        email: 'admin@exemplo.com',
        password: 'admin123',
        name: 'Administrador',
        isEmailVerified: true,
        authProvider: 'local'
      });
      console.log('✅ Usuário de exemplo (admin@exemplo.com) criado.');
    } catch (error) {
      if (error.message === 'E-mail já registrado.') {
        console.log('ℹ️ Usuário de exemplo já existe.');
      } else {
        console.error('❌ Erro ao criar usuário de exemplo:', error);
      }
    }
  }

  // Cria um usuário de exemplo para Google OAuth (simulado)
  if (process.env.NODE_ENV !== 'production' && !(await User.findByGoogleId('1234567890'))) {
    try {
      const googleUser = await User.create({
        email: 'google.user@exemplo.com',
        name: 'Usuário Google',
        googleId: '1234567890',
        picture: 'https://lh3.googleusercontent.com/a/AATXAJy4_...',
        isEmailVerified: true,
        authProvider: 'google'
      });
      console.log('✅ Usuário Google de exemplo (google.user@exemplo.com) criado.');
    } catch (error) {
      if (error.message === 'E-mail já registrado.') {
        console.log('ℹ️ Usuário Google de exemplo já existe.');
      } else {
        console.error('❌ Erro ao criar usuário Google de exemplo:', error);
      }
    }
  }
})();
