import React, { useState, useEffect, useMemo } from 'react';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCopy, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  FileDown, 
  UserMinus, 
  UserPlus, 
  Clock,
  ExternalLink
} from 'lucide-react';

// --- Types ---
type Day = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
const DAYS: Day[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

interface ScheduleRow {
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
  sab: string;
  dom: string;
}

interface Pharmacist {
  id: number;
  nome: string;
  cpf: string;
  crf: string; // New field
  dataNascimento: string;
  tipoInclusao: 'Já vinculado' | 'Nova contratação' | 'Transferido';
  filialOrigem: string;
  entrada: ScheduleRow;
  intervalo: ScheduleRow;
  retorno: ScheduleRow;
  saida: ScheduleRow;
}

interface Actions {
  alterarHorario: boolean;
  baixaFarma: boolean;
  inclusaoFarma: boolean;
}

interface BaixaDetails {
  nome: string;
  motivo: 'Desligamento' | 'Transferência';
  filialDestino: string;
}

// PDFs carregados da pasta public/
// Coloque os arquivos em: public/template.pdf e public/declaracao.pdf
const TEMPLATE_PDF_URL = '/template.pdf';
const DECLARACAO_PDF_URL = '/Documento Transferência - Site.pdf';

const FILIAIS: Record<string, { cidade: string; endereco: string }> = {
  "1": { cidade: "PORTO ALEGRE", endereco: "R. Dr. Flores, 194" }, [cite: 1]
  "2": { cidade: "PORTO ALEGRE", endereco: "Rua Ramiro Barcelos, nº 910, bloco E" }, [cite: 1]
  "4": { cidade: "PORTO ALEGRE", endereco: "Av. Borges de Medeiros, 589- e 595" }, [cite: 1]
  "5": { cidade: "PORTO ALEGRE", endereco: "Av. Azenha, 693" }, [cite: 1]
  "7": { cidade: "PORTO ALEGRE", endereco: "Av. Azenha, 1.401" }, [cite: 1]
  "8": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 1983" }, [cite: 1]
  "9": { cidade: "PORTO ALEGRE", endereco: "Av. Protásio Alves, 2640" }, [cite: 1]
  "10": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1238" }, [cite: 1]
  "11": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1401" }, [cite: 1]
  "12": { cidade: "PORTO ALEGRE", endereco: "Av. Venâncio Aires, 1102" }, [cite: 1]
  "13": { cidade: "PORTO ALEGRE", endereco: "Rua João Wallig, 1800 Lj. JW 13-Iguatemi" }, [cite: 1]
  "15": { cidade: "PORTO ALEGRE", endereco: "Av. Borges de Medeiros, 255" }, [cite: 1]
  "17": { cidade: "PORTO ALEGRE", endereco: "Av. Cristóvão Colombo, 2110" }, [cite: 1]
  "19": { cidade: "PORTO ALEGRE", endereco: "Avenida São Pedro, 577" }, [cite: 1]
  "20": { cidade: "PORTO ALEGRE", endereco: "Av. João Pessoa, 1831 – Lj. 1A - 202/203" }, [cite: 1]
  "21": { cidade: "PORTO ALEGRE", endereco: "Rua Vinte e Quatro de Outubro, 742" }, [cite: 1]
  "23": { cidade: "PORTO ALEGRE", endereco: "Av. Plínio Brasil Milano, 1000" }, [cite: 1]
  "25": { cidade: "PORTO ALEGRE", endereco: "Av. São Pedro, 878 – São Geraldo" }, [cite: 1]
  "28": { cidade: "PORTO ALEGRE", endereco: "Av. Getúlio Vargas, n° 480" }, [cite: 2]
  "29": { cidade: "PORTO ALEGRE", endereco: "Rua Ramiro Barcelos, 1115" }, [cite: 2]
  "30": { cidade: "SÃO SEBASTIÃO DO CAI", endereco: "Avenida Egidio Michaelsen, 477, bairro Centro" }, [cite: 2]
  "31": { cidade: "PORTO ALEGRE", endereco: "Avenida Protásio Alves, 4194 - subsolo" }, [cite: 2]
  "34": { cidade: "SAO LEOPOLDO", endereco: "Rua Independência, 424" }, [cite: 2]
  "35": { cidade: "SANTA CRUZ DO SUL", endereco: "Rua Marechal Floriano, 863" }, [cite: 2]
  "36": { cidade: "BAGE", endereco: "Av. Sete de Setembro, 1121" }, [cite: 3]
  "37": { cidade: "SANTA VITORIA DO PALMAR", endereco: "Rua Barão do Rio Branco, 439" }, [cite: 3]
  "38": { cidade: "PORTO ALEGRE", endereco: "Av. Cavalhada, 2955" }, [cite: 4]
  "40": { cidade: "URUGUAIANA", endereco: "Rua Duque de Caxias, 1625" }, [cite: 4]
  "41": { cidade: "CRUZ ALTA", endereco: "Avenida General Osório, 150, bairro Centro" }, [cite: 4]
  "43": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 3522" }, [cite: 4]
  "44": { cidade: "PORTO ALEGRE", endereco: "Av. Teresópolis, 3126" }, [cite: 5]
  "45": { cidade: "PORTO ALEGRE", endereco: "Av. Protásio Alves, 723" }, [cite: 5]
  "47": { cidade: "ALVORADA", endereco: "Avenida Presidente Vargas, nº 1957" }, [cite: 5]
  "48": { cidade: "PORTO ALEGRE", endereco: "Rua Zeca Neto, 38" }, [cite: 5]
  "50": { cidade: "ALEGRETE", endereco: "Rua Gaspar Martins, 322" }, [cite: 5]
  "51": { cidade: "BAGE", endereco: "Rua Monsenhor Hipólito, 02 Lj 01" }, [cite: 5]
  "52": { cidade: "PELOTAS", endereco: "Rua Andrade Neves, 1881" }, [cite: 5]
  "53": { cidade: "CACHOEIRA DO SUL", endereco: "Rua Júlio de Castilhos, 102" }, [cite: 5]
  "54": { cidade: "CAMAQUA", endereco: "Av. Presidente Vargas, 447" }, [cite: 6]
  "56": { cidade: "CARAZINHO", endereco: "Av. Flores da Cunha, 1421" }, [cite: 6]
  "57": { cidade: "CAXIAS DO SUL", endereco: "Av. Júlio de Castilhos, 1970" }, [cite: 7]
  "58": { cidade: "CRUZ ALTA", endereco: "Rua Duque de Caxias, 645 sala 03" }, [cite: 7]
  "59": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 2696" }, [cite: 8]
  "60": { cidade: "IJUI", endereco: "Rua XV de Novembro, 386" }, [cite: 8]
  "61": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Rua dos Andradas, 485" }, [cite: 8]
  "62": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Rua dos Andradas, 51" }, [cite: 8]
  "63": { cidade: "PELOTAS", endereco: "Av. General Osório, 1052" }, [cite: 9]
  "64": { cidade: "RIO GRANDE", endereco: "Rua Marechal Floriano Peixoto, 351" }, [cite: 9]
  "65": { cidade: "ROSARIO DO SUL", endereco: "R JOAO BRASIL, 831" }, [cite: 9]
  "66": { cidade: "SANTO ANGELO", endereco: "Rua Marquês do Herval, 1583" }, [cite: 9]
  "67": { cidade: "SANTA MARIA", endereco: "Rua Acampamento, 150" }, [cite: 9]
  "68": { cidade: "SAO LOURENCO DO SUL", endereco: "Rua Coronel Alfredo Born, 317" }, [cite: 9]
  "70": { cidade: "SANTIAGO", endereco: "Rua Getúlio Vargas, 1851" }, [cite: 9]
  "71": { cidade: "FARROUPILHA", endereco: "R Pinheiro Machado, 195 - Sala 02" }, [cite: 9]
  "72": { cidade: "SÃO BORJA", endereco: "Rua General Osório, 2160" }, [cite: 9]
  "73": { cidade: "SAO LUIZ GONZAGA", endereco: "Av. Sen. Pinheiro Machado, 2476" }, [cite: 10]
  "74": { cidade: "URUGUAIANA", endereco: "Rua Domingos de Almeida, 1946" }, [cite: 10]
  "75": { cidade: "VACARIA", endereco: "Rua Borges de Medeiros, 1313" }, [cite: 10]
  "77": { cidade: "DOM PEDRITO", endereco: "Av. Rio Branco, 844" }, [cite: 11]
  "78": { cidade: "BENTO GONCALVES", endereco: "Rua Marechal Deodoro, 17" }, [cite: 11]
  "79": { cidade: "ITAQUI", endereco: "Avenida Humberto de Alencar Castelo Branco, nº 1044" }, [cite: 11]
  "80": { cidade: "TAQUARA", endereco: "Rua Júlio de Castilhos, 2594" }, [cite: 11]
  "81": { cidade: "TRES PASSOS", endereco: "Av. Júlio de Castilhos, 788" }, [cite: 12]
  "82": { cidade: "TRAMANDAI", endereco: "Av. Emancipação, 161" }, [cite: 12]
  "83": { cidade: "TORRES", endereco: "Avenida Barão do Rio Branco, nº 235, bairro Centro" }, [cite: 12]
  "84": { cidade: "SANTA ROSA", endereco: "Av. Rio Branco, 447" }, [cite: 13]
  "85": { cidade: "PALMEIRA DAS MISSOES", endereco: "Av. Independência, 1112" }, [cite: 13]
  "87": { cidade: "PORTO ALEGRE", endereco: "Av. Venâncio Aires, 399, Loja 01" }, [cite: 13]
  "88": { cidade: "SANTO ANGELO", endereco: "Rua Marquês do Herval, 1118" }, [cite: 13]
  "91": { cidade: "PELOTAS", endereco: "Rua Santos Dumont, 856" }, [cite: 13]
  "92": { cidade: "PELOTAS", endereco: "Rua Quinze de Novembro , 454" }, [cite: 13]
  "93": { cidade: "PELOTAS", endereco: "Rua Santos Dumont, 487" }, [cite: 13]
  "94": { cidade: "RIO GRANDE", endereco: "Rua Luiz Lórea, 502" }, [cite: 13]
  "95": { cidade: "RIO GRANDE", endereco: "Rua 24 de Maio, 400/402" }, [cite: 13]
  "96": { cidade: "JAGUARAO", endereco: "Rua 27 de Janeiro, 408" }, [cite: 13]
  "97": { cidade: "PELOTAS", endereco: "Rua Andrade Neves, 1575" }, [cite: 13]
  "98": { cidade: "PELOTAS", endereco: "Av. Bento Gonçalves, 3331" }, [cite: 14]
  "101": { cidade: "PORTO ALEGRE", endereco: "Av. Praia de Belas, 1181 – Lj 7" }, [cite: 14]
  "102": { cidade: "ALEGRETE", endereco: "Praça Presidente Getúlio Vargas, 360" }, [cite: 14]
  "103": { cidade: "FREDERICO WESTPHALEN", endereco: "Rua do Comércio, 590" }, [cite: 14]
  "111": { cidade: "PORTO ALEGRE", endereco: "Avenida Baltazar de Oliveira Garcia, nº 3710, bairro Rubem Berta" }, [cite: 14]
  "113": { cidade: "PORTO ALEGRE", endereco: "Av. Oscar Pereira, 2679" }, [cite: 15]
  "114": { cidade: "CACHOEIRA DO SUL", endereco: "Rua Sete de Setembro, 1109" }, [cite: 15]
  "115": { cidade: "SANTA MARIA", endereco: "Praça Saldanha Marinho, 35" }, [cite: 15]
  "117": { cidade: "NOVO HAMBURGO", endereco: "Av. Nações Unidas, 2001/1001 – Rio Branco" }, [cite: 16]
  "118": { cidade: "SÃO GABRIEL", endereco: "Rua General Mallet, 456 terreo" }, [cite: 16]
  "119": { cidade: "PASSO FUNDO", endereco: "Rua Moron, 1513" }, [cite: 16]
  "120": { cidade: "CANOAS", endereco: "Av. Getúlio Vargas, 5765" }, [cite: 16]
  "121": { cidade: "TORRES", endereco: "Av. Barão do Rio Branco, 52" }, [cite: 17]
  "122": { cidade: "SAO LEOPOLDO", endereco: "Avenida Indepedência, 714" }, [cite: 17]
  "123": { cidade: "PORTO ALEGRE", endereco: "Rua General Lima e Silva, 606" }, [cite: 17]
  "125": { cidade: "OSORIO", endereco: "Rua Major João Marques, 515 – Lj 01" }, [cite: 17]
  "126": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 4320 Sala 51" }, [cite: 18]
  "127": { cidade: "PORTO ALEGRE", endereco: "Av. Nilópolis, 543 - Lj. 5/6" }, [cite: 18]
  "128": { cidade: "GRAMADO", endereco: "Av. Borges de Medeiros, 2506" }, [cite: 19]
  "130": { cidade: "SAPUCAIA DO SUL", endereco: "Avenida Sapucaia, nº 2.096, sala 2102" }, [cite: 19]
  "131": { cidade: "CAXIAS DO SUL", endereco: "Rua General Arcy da Rocha Nóbrega, 421" }, [cite: 19]
  "133": { cidade: "NOVO HAMBURGO", endereco: "Av. Pedro Adams Filho, 5477 , loja 01" }, [cite: 20]
  "137": { cidade: "PASSO FUNDO", endereco: "Av. Brasil Leste, 200 – Lj 42/44" }, [cite: 20]
  "138": { cidade: "PORTO ALEGRE", endereco: "Cristóvão Colombo, 1271 – Lj 101" }, [cite: 20]
  "139": { cidade: "PORTO ALEGRE", endereco: "Av. Ipiranga, 5200 – Lj 146" }, [cite: 21]
  "140": { cidade: "CAPAO DA CANOA", endereco: "Av. Flavio Boianovski 1417" }, [cite: 21]
  "141": { cidade: "PORTO ALEGRE", endereco: "Av. Doutor Nilo Peçanha, 1737" }, [cite: 22]
  "142": { cidade: "PORTO ALEGRE", endereco: "Rua Santa Cecília, 1269 – Lj 01" }, [cite: 22]
  "144": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 4048 - Lj 03" }, [cite: 23]
  "146": { cidade: "IMBE", endereco: "Avenida Paraguassú, nº 1.474, bairro Centro" }, [cite: 23]
  "149": { cidade: "RIO PARDO", endereco: "Rua Andrade Neves, 626" }, [cite: 23]
  "151": { cidade: "PORTO ALEGRE", endereco: "Rua Múcio Teixeira, 680 – Lj 103/104" }, [cite: 23]
  "153": { cidade: "PORTO ALEGRE", endereco: "Rua Olavo Barreto Viana, 36 – Lj 126" }, [cite: 23]
  "157": { cidade: "PASSO FUNDO", endereco: "Rua Uruguai, 1620 – Salas 212/213" }, [cite: 23]
  "159": { cidade: "RIO GRANDE", endereco: "Av. Rio Grande, 162" }, [cite: 24]
  "160": { cidade: "GRAVATAÍ", endereco: "Av. José Loureiro da Silva, 1504" }, [cite: 24]
  "161": { cidade: "PORTO ALEGRE", endereco: "Avenida Assis Brasil, nº 164 – SUC 61 e 62, bairro Santa Maria Goretti" }, [cite: 24]
  "163": { cidade: "PORTO ALEGRE", endereco: "Av. João Wallig, 1903" }, [cite: 25]
  "164": { cidade: "PORTO ALEGRE", endereco: "Av. Carlos Gomes, 11 – Lj 03" }, [cite: 25]
  "165": { cidade: "PORTO ALEGRE", endereco: "Av. Ipiranga, 6690 - Bl 02/Prédio 60/Térreo" }, [cite: 25]
  "166": { cidade: "PORTO ALEGRE", endereco: "Av. Túlio de Rose, 80 – Loja 129 e 130" }, [cite: 26]
  "167": { cidade: "PORTO ALEGRE", endereco: "Av. Otto Niemeyer, 2500 - Lojas 103 e 104" }, [cite: 27]
  "168": { cidade: "PORTO ALEGRE", endereco: "Avenida Mostardeiro, 287" }, [cite: 27]
  "170": { cidade: "NOVO HAMBURGO", endereco: "Rua 1º de Março, 1111 – Lj 03" }, [cite: 27]
  "171": { cidade: "PORTO ALEGRE", endereco: "Av. Cavalhada, 3621 – LJ 01" }, [cite: 28]
  "173": { cidade: "CAXIAS DO SUL", endereco: "Avenida Júlio de Castilhos, nº 2.234, loja 1" }, [cite: 28]
  "175": { cidade: "CANOAS", endereco: "Rua Quinze de Janeiro, nº 481, salas 214-3 / 214-4 / 214-5" }, [cite: 28]
  "176": { cidade: "ERECHIM", endereco: "Av. Maurício Cardoso, 17" }, [cite: 29]
  "178": { cidade: "ESTEIO", endereco: "R Padre Felipe, 257" }, [cite: 29]
  "179": { cidade: "MARAU", endereco: "Rua Julio Borella, 1067 – Sala 102" }, [cite: 29]
  "181": { cidade: "CANOAS", endereco: "Rua Tiradentes, 291" }, [cite: 29]
  "182": { cidade: "PORTO ALEGRE", endereco: "Av. Cristóvão Colombo, 545 – Lj 1224 – Sh Total" }, [cite: 30]
  "183": { cidade: "PORTO ALEGRE", endereco: "Av. Independência, 155 – Sala 02" }, [cite: 31]
  "184": { cidade: "PORTO ALEGRE", endereco: "Rua Otto Niemayer, 601 – Tristeza" }, [cite: 31]
  "185": { cidade: "PORTO ALEGRE", endereco: "Avenida Serevo Dullius, 90010 - T1.N2.057" }, [cite: 31]
  "186": { cidade: "PORTO ALEGRE", endereco: "Av. Juca Batista, 925 – Lj 101" }, [cite: 32]
  "187": { cidade: "ESTRELA", endereco: "R RUA TIRADENTES, 248" }, [cite: 32]
  "188": { cidade: "NOVO HAMBURGO", endereco: "Av. Pedro Adans Filho, 5573" }, [cite: 33]
  "190": { cidade: "CAXIAS DO SUL", endereco: "Rua Vinte de Setembro, 2352 – Lurdes" }, [cite: 33]
  "192": { cidade: "PORTO ALEGRE", endereco: "Av. Wenceslau Escobar, 2857 Lj 04" }, [cite: 33]
  "193": { cidade: "TRAMANDAI", endereco: "Av. Emancipação, 898 – Lj ¾ - Praia" }, [cite: 34]
  "194": { cidade: "CIDREIRA", endereco: "Av. Mostardeiros, 3213 – Salas 1 e 2" }, [cite: 34]
  "195": { cidade: "SANTA MARIA", endereco: "Av. Presidente Vargas, 2194" }, [cite: 34]
  "196": { cidade: "TAPES", endereco: "Av. Assis Brasil, 412" }, [cite: 35]
  "197": { cidade: "QUARAI", endereco: "Avenida Sete de Setembro, nº 775" }, [cite: 35]
  "199": { cidade: "CAXIAS DO SUL", endereco: "Rua Borges de Medeiros, 391– Lj 3/4" }, [cite: 35]
  "301": { cidade: "CAXIAS DO SUL", endereco: "Rodovia RSC 453, KM 3,5 - nº 2780, loja 159" }, [cite: 35]
  "302": { cidade: "RIO GRANDE", endereco: "Av. Rio Grande, 251" }, [cite: 36]
  "303": { cidade: "RIO GRANDE", endereco: "Avenida Presidente Vargas, 687" }, [cite: 36]
  "304": { cidade: "RIO GRANDE", endereco: "Rua Doutor Nascimento, 389, 391 e 399" }, [cite: 36]
  "124": { cidade: "XANGRILA", endereco: "Av. Paraguassú, 4561" }, [cite: 36]
  "306": { cidade: "XANGRILA", endereco: "Av. Paraguassú, 1214, Loja 1" }, [cite: 37]
  "307": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 2611 - Sala 102" }, [cite: 37]
  "308": { cidade: "PORTO ALEGRE", endereco: "Rua José de Alencar, nº 286, Sala 05, bairro Menino Deus" }, [cite: 37]
  "309": { cidade: "PELOTAS", endereco: "Avenida Dom Joaquim, 680" }, [cite: 37]
  "310": { cidade: "PORTO ALEGRE", endereco: "Rua Vicente da Fontoura, 2759" }, [cite: 37]
  "311": { cidade: "PORTO ALEGRE", endereco: "Rua Casemiro de Abreu, 1755 - e 1775" }, [cite: 37]
  "312": { cidade: "PORTO ALEGRE", endereco: "Rua Marquês do pombal, 565 - Moinhos de Vento" }, [cite: 37]
  "313": { cidade: "PORTO ALEGRE", endereco: "Avenida Wenceslau Escobar, 1933 - Cristal" }, [cite: 37]
  "314": { cidade: "PELOTAS", endereco: "Rua Visconde de Ouro Preto, 46 - Areal" }, [cite: 37]
  "315": { cidade: "OSORIO", endereco: "Av. Paraguassú, 444" }, [cite: 38]
  "319": { cidade: "SANTA CRUZ DO SUL", endereco: "Rua Thomaz Flores, 206" }, [cite: 38]
  "321": { cidade: "PELOTAS", endereco: "Avenida Ferreira Viana, 1526 - Lojas 4, 5 e 6" }, [cite: 38]
  "322": { cidade: "PORTO ALEGRE", endereco: "Avenida Guaporé, nº 324" }, [cite: 38]
  "323": { cidade: "PORTO ALEGRE", endereco: "Avenida Cristóvão Colombo, 2999" }, [cite: 38]
  "324": { cidade: "PORTO ALEGRE", endereco: "Avenida Protásio Alves, 2121" }, [cite: 38]
  "325": { cidade: "NOVO HAMBURGO", endereco: "Rua Bento Gonçalves, 2917 - Lojas 1 e 2" }, [cite: 38]
  "326": { cidade: "PORTO ALEGRE", endereco: "Avenida Nilo Peçanha, 3200 - Lojas 48 e 49" }, [cite: 38]
  "327": { cidade: "SANTA MARIA", endereco: "Avenida Rio Branco, n° 533" }, [cite: 38]
  "330": { cidade: "PORTO ALEGRE", endereco: "Avenida Nilo Peçanha, 95 - Loja A" }, [cite: 38]
  "333": { cidade: "SAO LEOPOLDO", endereco: "Avenida João Correa, 532" }, [cite: 38]
  "334": { cidade: "BALNEÁRIO PINHAL", endereco: "Rua Humberto de Alencar Castelo Branco, 374 - Ljs 3 e 4" }, [cite: 38]
  "335": { cidade: "SANTA MARIA", endereco: "Rua General Neto, 1097" }, [cite: 38]
  "336": { cidade: "CAXIAS DO SUL", endereco: "Avenida Rio Branco, 425 - Lojas 102 e 103" }, [cite: 38]
  "337": { cidade: "PELOTAS", endereco: "Avenida Dom Joaquim, nº 603 - Loja 1" }, [cite: 39]
  "338": { cidade: "PASSO FUNDO", endereco: "Rua Quinze de Novembro, 318" }, [cite: 39]
  "340": { cidade: "OSORIO", endereco: "Avenida Getúlio Vargas, nº 525" }, [cite: 39]
  "341": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 2786" }, [cite: 39]
  "343": { cidade: "PORTO ALEGRE", endereco: "Rua Valparaíso, 698" }, [cite: 39]
  "344": { cidade: "PORTO ALEGRE", endereco: "Av. Plínio Brasil Milano, 1689 - Loja 101" }, [cite: 40]
  "345": { cidade: "PELOTAS", endereco: "Rua Gonçalves Chaves, 2920" }, [cite: 40]
  "346": { cidade: "BAGE", endereco: "Avenida Tupy Silveira, 1887 - Sala 01" }, [cite: 40]
  "347": { cidade: "PORTO ALEGRE", endereco: "Avenida Edgar Pires de Castro, 1395" }, [cite: 40]
  "348": { cidade: "ARROIO GRANDE", endereco: "Rua Visconde de Mauá, 431" }, [cite: 40]
  "349": { cidade: "PORTO ALEGRE", endereco: "Avenida Doutor Nilo Peçanha, 690" }, [cite: 40]
  "350": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1480" }, [cite: 40]
  "351": { cidade: "PORTO ALEGRE", endereco: "Avenida Juca Batista, 4255 - SUC 128" }, [cite: 40]
  "352": { cidade: "URUGUAIANA", endereco: "Rua Quinze de Novembro, 2.755" }, [cite: 40]
  "353": { cidade: "CAXIAS DO SUL", endereco: "Rua Tronca, 2730" }, [cite: 40]
  "354": { cidade: "SANTA ROSA", endereco: "Avenida Expedicionário Weber, 805" }, [cite: 40]
  "355": { cidade: "TORRES", endereco: "Rua Bento Gonçalves, 81" }, [cite: 40]
  "356": { cidade: "IJUI", endereco: "Rua Doutor Pestana, 20" }, [cite: 40]
  "357": { cidade: "PORTO ALEGRE", endereco: "Rua Paraguai, 100 loja 104 , Rio Branco" }, [cite: 40]
  "358": { cidade: "CAXIAS DO SUL", endereco: "Rua Professor Marcos Martini, 480" }, [cite: 40]
  "359": { cidade: "SANTA MARIA", endereco: "Avenida Nossa Senhora Medianeira, 1318" }, [cite: 40]
  "360": { cidade: "URUGUAIANA", endereco: "Avenida Presidente Getúlio Vargas, 3307" }, [cite: 40]
  "361": { cidade: "CARLOS BARBOSA", endereco: "Rua Buarque de Macedo, 3867" }, [cite: 40]
  "362": { cidade: "ESTEIO", endereco: "Avenida Presidente Vargas, 2358 - Lojas 1 e 2" }, [cite: 41]
  "363": { cidade: "CAPAO DA CANOA", endereco: "Rua Sepé, 1931" }, [cite: 41]
  "364": { cidade: "GRAMADO", endereco: "Avenida das Hortênsias, nº 3.860" }, [cite: 41]
  "365": { cidade: "CANGUÇU", endereco: "Rua General Osório, 1099" }, [cite: 41]
  "366": { cidade: "GRAMADO", endereco: "Av. das Hortênsias, 1929 - Loja 101" }, [cite: 42]
  "367": { cidade: "PELOTAS", endereco: "Avenida Ferreira Viana, nº 476" }, [cite: 42]
  "368": { cidade: "TRAMANDAI", endereco: "Rua Rubem Berta, 1445" }, [cite: 42]
  "369": { cidade: "PORTO ALEGRE", endereco: "Avenida do Forte, 1396 - Loja 1" }, [cite: 42]
  "370": { cidade: "GUAIBA", endereco: "Rua Sete de Setembro, 360" }, [cite: 42]
  "371": { cidade: "DOIS IRMÃOS", endereco: "Avenida 25 de Julho, nº 785" }, [cite: 42]
  "373": { cidade: "VACARIA", endereco: "Rua Julio de Castilhos, nº 1.063" }, [cite: 42]
  "374": { cidade: "PORTO ALEGRE", endereco: "Rua Santana, nº 1501, loja 1" }, [cite: 42]
  "375": { cidade: "LAJEADO", endereco: "Avenida Benjamin Constant, nº 1.707" }, [cite: 42]
  "376": { cidade: "PORTO ALEGRE", endereco: "Avenida Cavalhada, nº 2351, 2369 e 2373" }, [cite: 42]
  "378": { cidade: "PORTO ALEGRE", endereco: "Av. Teresópolis, 3487" }, [cite: 43]
  "379": { cidade: "FLORES DA CUNHA", endereco: "Rua Borges de Medeiros, nº 1.461, salas 01 e 02" }, [cite: 43]
  "382": { cidade: "GRAVATAÍ", endereco: "Avenida Dorival Cândido Luz de Oliveira, nº 680" }, [cite: 43]
  "383": { cidade: "PORTO ALEGRE", endereco: "Rua Vinte e Quatro de Outubro, 1.465" }, [cite: 43]
  "384": { cidade: "IVOTI", endereco: "Avenida Presidente Lucena, nº 3.040, loja 03" }, [cite: 43]
  "386": { cidade: "CAXIAS DO SUL", endereco: "Rua General Malett, 56" }, [cite: 43]
  "387": { cidade: "CANOAS", endereco: "Avenida Farroupilha, nº 4.545, loja 2.078, Pavimento L2" }, [cite: 43]
  "389": { cidade: "ELDORADO DO SUL", endereco: "Avenida Getulio Vargas, 274" }, [cite: 43]
  "390": { cidade: "LAGOA VERMELHA", endereco: "Av. Afonso Pena, 630 sala 14" }, [cite: 44]
  "392": { cidade: "PORTO ALEGRE", endereco: "Avenida Panamericana, 670" }, [cite: 44]
  "393": { cidade: "MONTENEGRO", endereco: "Rua José Luiz, nº 1.485" }, [cite: 44]
  "394": { cidade: "IBIRUBA", endereco: "Rua General Osório, nº 878, sala 01" }, [cite: 44]
  "395": { cidade: "PASSO FUNDO", endereco: "Avenida Presidente Vargas, 1610 lojas 2004,2005,2006 e 2007" }, [cite: 44]
  "396": { cidade: "SÃO BORJA", endereco: "Rua General Marques, nº 902, Loja 1" }, [cite: 44]
  "397": { cidade: "PORTO ALEGRE", endereco: "Rua Sarmento Leite n°876, ljs 880 e 882" }, [cite: 44]
  "398": { cidade: "SAPUCAIA DO SUL", endereco: "Rua Professor Francisco Brochado da Rocha, nº 393" }, [cite: 44]
  "399": { cidade: "CANELA", endereco: "Rua João Pessoa, 192" }, [cite: 44]
  "400": { cidade: "NOVO HAMBURGO", endereco: "Av. Dr. Maurício Cardoso, 833 - Sl 102" }, [cite: 45]
  "401": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 914" }, [cite: 45]
  "403": { cidade: "CAXIAS DO SUL", endereco: "Rua Alfredo Chaves, 1332 – Suc 001 – Zaffari" }, [cite: 45]
  "404": { cidade: "SAPIRANGA", endereco: "Rua João Corrêa, 1193" }, [cite: 45]
  "405": { cidade: "SAO LEOPOLDO", endereco: "Av. Primeiro de Março, 821 – Suc 215" }, [cite: 46]
  "406": { cidade: "CAXIAS DO SUL", endereco: "Rua Sinimbu, 135 SUC 003" }, [cite: 46]
  "408": { cidade: "PORTO ALEGRE", endereco: "Coronel Bordini, 12" }, [cite: 46]
  "411": { cidade: "CAMPO BOM", endereco: "Av. Brasil, 3057" }, [cite: 47]
  "412": { cidade: "CANELA", endereco: "Rua Júlio de Castilhos, 509" }, [cite: 47]
  "414": { cidade: "PORTO ALEGRE", endereco: "Av. Getúlio Vargas, 1714" }, [cite: 47]
  "415": { cidade: "PORTO ALEGRE", endereco: "Rua Fernandes Vieira, 401 – suc 102" }, [cite: 47]
  "416": { cidade: "NOVA PETROPOLIS", endereco: "Av. Quinze de Novembro, 1150 – Lj 02" }, [cite: 48]
  "417": { cidade: "PASSO FUNDO", endereco: "Av. Presidente Vargas, 895" }, [cite: 48]
  "421": { cidade: "SANTA MARIA", endereco: "Rua Marechal Floriano, 1000 - Lj Térreo" }, [cite: 48]
  "425": { cidade: "ARROIO DO SAL", endereco: "Av. Assis Brasil, 420" }, [cite: 49]
  "427": { cidade: "CHARQUEADAS", endereco: "Rua Bento Gonçalves, 691" }, [cite: 49]
  "429": { cidade: "BENTO GONCALVES", endereco: "Rua José Mário Mônaco, 333, loja 102" }, [cite: 49]
  "430": { cidade: "GARIBALDI", endereco: "Avenida Independência, nº 195, sala comercial 1" }, [cite: 49]
  "431": { cidade: "GRAMADO", endereco: "Av. Borges de Medeiros, 1419 - Lj 01" }, [cite: 50]
  "432": { cidade: "ESTANCIA VELHA", endereco: "Rua Presidente Lucena, 3417" }, [cite: 50]
  "439": { cidade: "VIAMAO", endereco: "Av. Placido Mottin, n° 1325" }, [cite: 50]
  "440": { cidade: "PORTO ALEGRE", endereco: "Av. Ipiranga, 6681 Prédio 12B - Térreo" }, [cite: 51]
  "441": { cidade: "PORTO ALEGRE", endereco: "Rua Ladislau Neto, nº 595" }, [cite: 51]
  "442": { cidade: "PORTO ALEGRE", endereco: "Avenida Osvaldo Aranha, 1382" }, [cite: 51]
  "455": { cidade: "PORTO ALEGRE", endereco: "Rua Vinte e Quatro de Outubro, 722" }, [cite: 51]
  "456": { cidade: "PORTO ALEGRE", endereco: "Av. Diário de Notícias, 300 - Lj 1004" }, [cite: 52]
  "460": { cidade: "SANTA MARIA", endereco: "Rua Euclides da Cunha, nº 1.607, bairro Nossa Senhora das Dores" }, [cite: 52]
  "461": { cidade: "SAO LEOPOLDO", endereco: "Rua Lindolfo Collor, nº 660, bairro Centro" }, [cite: 52]
  "462": { cidade: "GUAIBA", endereco: "Rua São José, 546" }, [cite: 52]
  "463": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Rua dos Andradas, 16 e 20" }, [cite: 52]
  "464": { cidade: "PORTO ALEGRE", endereco: "Avenida Cavalhada, nº 3.860" }, [cite: 52]
  "465": { cidade: "PORTO ALEGRE", endereco: "Avenida Sertório, 8000 - Sala 208" }, [cite: 52]
  "468": { cidade: "RIO GRANDE", endereco: "Rua Visconde do Paranaguá, 43" }, [cite: 52]
  "469": { cidade: "RIO GRANDE", endereco: "Dr. Napoleão Laureano, 517 Loja 01" }, [cite: 53]
  "470": { cidade: "RIO GRANDE", endereco: "Avenida Rio Grande, 79 Loja 11" }, [cite: 53]
  "471": { cidade: "PELOTAS", endereco: "Largo Portugal, 1155 Loja 09" }, [cite: 53]
  "476": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 2043" }, [cite: 54]
  "477": { cidade: "PELOTAS", endereco: "Avenida Adolfo Fetter, 3300, Lj 01- Recanto de Portugal - Praia" }, [cite: 54]
  "478": { cidade: "VIAMAO", endereco: "Av. Cel. Marcos de Andrade, 141, Lojas 104 e 105, Sobrelojas 204 e 205" }, [cite: 55]
  "482": { cidade: "RIO GRANDE", endereco: "Av Joao Oliveira, 1, Bairro Parque Residencial Jardim Do Sol" }, [cite: 55]
  "483": { cidade: "PORTO ALEGRE", endereco: "Rua Padre Chagas, 217" }, [cite: 55]
  "484": { cidade: "SANTA MARIA", endereco: "Rua Doutor Bozano, 973, loja 07" }, [cite: 55]
  "485": { cidade: "PASSO FUNDO", endereco: "Avenida General Netto, 170 - Edifício JB Estacia" }, [cite: 55]
  "486": { cidade: "PORTO ALEGRE", endereco: "Rua Anita Garibaldi, 600 - Loja 101" }, [cite: 55]
  "487": { cidade: "PORTO ALEGRE", endereco: "Av. Wenceslau Escobar, n° 1286 - SUC 11" }, [cite: 56]
  "488": { cidade: "BAGE", endereco: "Avenida Tupy Silveira, 1401" }, [cite: 56]
  "492": { cidade: "PASSO FUNDO", endereco: "Rua Paissandú, 1343" }, [cite: 56]
  "493": { cidade: "PELOTAS", endereco: "Avenida Almirante Barroso, 2098" }, [cite: 56]
  "495": { cidade: "NOVO HAMBURGO", endereco: "Avenida Doutor Maurício Cardoso, 1670, lojas 1, 2 e 3" }, [cite: 56]
  "496": { cidade: "PORTO ALEGRE", endereco: "Rua Vicente da Fontoura, nº 1.676" }, [cite: 56]
  "498": { cidade: "CANOAS", endereco: "Avenida Santos Ferreira, 1400" }, [cite: 56]
  "499": { cidade: "RIO GRANDE", endereco: "Rua Jockey Clube, 155, Loja 48" }, [cite: 56]
  "701": { cidade: "PORTO ALEGRE", endereco: "Av. Cristóvão Colombo, 976/980, 564 e 572" }, [cite: 57]
  "702": { cidade: "PORTO ALEGRE", endereco: "Rua Anita Garibaldi, 2099 – Lj 02" }, [cite: 57]
  "703": { cidade: "CACHOEIRINHA", endereco: "Av. General Flores da Cunha, 1233 loja 2" }, [cite: 58]
  "705": { cidade: "CACHOEIRINHA", endereco: "Av. General Flores da Cunha, 4315" }, [cite: 58]
  "706": { cidade: "VIAMAO", endereco: "Avenida Liberdade, nº 1.553" }, [cite: 58]
  "707": { cidade: "CANOAS", endereco: "Avenida Doutor Sezefredo Azambuja Vieira, nº 907 e 901, loja 4 e loja 5" }, [cite: 58]
  "708": { cidade: "VENANCIO AIRES", endereco: "Rua Osvaldo Aranha, nº 1.477" }, [cite: 58]
  "709": { cidade: "SANTO ANTONIO DA PATRULHA", endereco: "Rua Coronel Victor Villa Verde, 250" }, [cite: 58]
  "712": { cidade: "CRUZ ALTA", endereco: "Rua Barão do Rio Branco, 1484" }, [cite: 58]
  "713": { cidade: "TAQUARA", endereco: "Rua General Frota, 2580, loja 02" }, [cite: 58]
  "714": { cidade: "CAXIAS DO SUL", endereco: "Rua Ernesto Alves, 1405" }, [cite: 58]
  "716": { cidade: "CAXIAS DO SUL", endereco: "Rua Visconde de Pelotas, 819" }, [cite: 58]
  "717": { cidade: "IJUI", endereco: "Rua Bento Gonçalves, 415, bairro Centro" }, [cite: 58]
  "718": { cidade: "VERANÓPOLIS", endereco: "Rua Júlio de Castilhos, 818 loja 03" }, [cite: 58]
  "721": { cidade: "TEUTONIA", endereco: "Rua Três de Outubro, nº 371, bairro Languiru" }, [cite: 58]
  "722": { cidade: "XANGRILA", endereco: "Avenida Paraguassu, nº 2.255, bairro Centro" }, [cite: 58]
  "723": { cidade: "XANGRILA", endereco: "Rua Água Marinha, 1421" }, [cite: 58]
  "726": { cidade: "PORTO ALEGRE", endereco: "Avenida Assis Brasil, 5.451 - 5.431, bairro Sarandi" }, [cite: 58]
  "727": { cidade: "PELOTAS", endereco: "Rua Gonçalves Chaves, 483, bairro Centro" }, [cite: 59]
  "728": { cidade: "SOLEDADE", endereco: "Avenida Marcehal Floriano Peixoto, 965" }, [cite: 59]
  "729": { cidade: "CAXIAS DO SUL", endereco: "Rua Coronel Flores" }, [cite: 59]
  "730": { cidade: "PELOTAS", endereco: "Rua Santos Dumont, n° 770" }, [cite: 59]
  "731": { cidade: "PORTO ALEGRE", endereco: "Rua Professor Annes Dias, 135- Sala no andar Térreo - Hospital Santa Clara" }, [cite: 59]
  "732": { cidade: "BENTO GONCALVES", endereco: "R SALDANHA MARINHO, 110 - SALA 01" }, [cite: 59]
  "733": { cidade: "PORTO ALEGRE", endereco: "Rua Silveiro, 181" }, [cite: 59]
  "736": { cidade: "FARROUPILHA", endereco: "Rua Treze de maio, 585" }, [cite: 59]
  "737": { cidade: "CANOAS", endereco: "Av. Santos Ferreira, 641" }, [cite: 60]
  "738": { cidade: "SANTA CRUZ DO SUL", endereco: "Rua Vinte e Oito de Setembro, 585" }, [cite: 60]
  "739": { cidade: "CANOAS", endereco: "Av. Boqueirão - 1721" }, [cite: 60]
  "740": { cidade: "NOVA PRATA", endereco: "Av. Presidente Vargas, nº 1.148, bairro Centro" }, [cite: 61]
  "741": { cidade: "PORTO ALEGRE", endereco: "Rua Dona Adda Mascarenhas de Moraes, nº 57" }, [cite: 61]
  "743": { cidade: "BENTO GONCALVES", endereco: "Rua General Osorio ,235" }, [cite: 61]
  "744": { cidade: "BENTO GONCALVES", endereco: "Rua Guilherme Fasolo, n° 987" }, [cite: 61]
  "747": { cidade: "BENTO GONCALVES", endereco: "Rua Treze de Maio, nº 877, Lojas 102 e 103" }, [cite: 61]
  "748": { cidade: "PORTO ALEGRE", endereco: "Avenida Goethe, nº 210, bairro Rio Branco" }, [cite: 61]
  "749": { cidade: "IMBE", endereco: "Avenida Paraguassu, n°2966, centro" }, [cite: 61]
  "750": { cidade: "Camaqua", endereco: "Rua Bento Gonçalves, 1032" }, [cite: 61]
  "751": { cidade: "PASSO FUNDO", endereco: "Avenida Presidente Vargas n°75, bairro Vila Rodrigues" }, [cite: 61]
  "752": { cidade: "NOVO HAMBURGO", endereco: "Rua Bartolomeu Gusmão, 303 - Canudos" }, [cite: 61]
  "753": { cidade: "ALEGRETE", endereco: "Avenida Dr. Lauro Dorneles, 01" }, [cite: 61]
  "756": { cidade: "IJUI", endereco: "Rua Mato Grosso, 17" }, [cite: 61]
  "758": { cidade: "CAXIAS DO SUL", endereco: "Rua João Venzon Netto, 67" }, [cite: 61]
  "759": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Av. Presidente João Belchior Goulart, 841" }, [cite: 62]
  "760": { cidade: "CAMPO BOM", endereco: "Avenida Brasil, 2630" }, [cite: 62]
  "762": { cidade: "SANTA MARIA", endereco: "Avenida Nossa Senhora Medianeira, 2073" }, [cite: 62]
  "763": { cidade: "SANTO ANGELO", endereco: "Rua Sete de Setembro, 538" }, [cite: 62]
  "766": { cidade: "PASSO FUNDO", endereco: "Avenida Brasil Oeste, 02" }, [cite: 62]
  "767": { cidade: "PORTO ALEGRE", endereco: "Rua Pedro Ivo , 844" }, [cite: 62]
  "768": { cidade: "SÃO BORJA", endereco: "Rua Andradas 2161, Centro" }, [cite: 62]
  "769": { cidade: "ERECHIM", endereco: "Av. Sete de Setembro, 665" }, [cite: 63]
  "771": { cidade: "SÃO GABRIEL", endereco: "Rua Mascarenhas de Moraes, nº 290" }, [cite: 63]
  "775": { cidade: "CACHOEIRA DO SUL", endereco: "Rua Sete de Setembro, 1536" }, [cite: 63]
  "776": { cidade: "PORTO ALEGRE", endereco: "Av. Praia de Belas 1720" }, [cite: 63]
  "777": { cidade: "URUGUAIANA", endereco: "Rua quinze de novembro, 1782" }, [cite: 63]
  "778": { cidade: "PORTO ALEGRE", endereco: "Av. coronel aparicio borges, 250 loja 216" }, [cite: 64]
  "779": { cidade: "PORTO ALEGRE", endereco: "Avenida Panamericana, 240" }, [cite: 64]
  "780": { cidade: "CAXIAS DO SUL", endereco: "Rua São José,2089" }, [cite: 64]
  "781": { cidade: "IGREJINHA", endereco: "Rua General Ernesto Dornelles, 456" }, [cite: 64]
  "782": { cidade: "GRAVATAÍ", endereco: "Avenida Ely Correa, 759" }, [cite: 64]
  "783": { cidade: "PORTO ALEGRE", endereco: "Avenida Protásio Alves, nº 7.005" }, [cite: 64]
  "784": { cidade: "NOVO HAMBURGO", endereco: "Rua Marcílio Dias, nº 2.085" }, [cite: 64]
  "786": { cidade: "PORTO ALEGRE", endereco: "Avenida Protasio Alves,8323" }, [cite: 64]
  "787": { cidade: "PAROBE", endereco: "Rua Dr. Legendre, nº 310" }, [cite: 64]
  "789": { cidade: "BAGE", endereco: "Rua Tupy Silveira, 2399" }, [cite: 64]
  "790": { cidade: "PASSO FUNDO", endereco: "Av. Brasil Oeste, 1347" }, [cite: 65]
  "792": { cidade: "BENTO GONCALVES", endereco: "Rua Fortaleza, 356" }, [cite: 65]
  "794": { cidade: "Camaqua", endereco: "Rua Presidente Vargas, nº 744, bairro Centro" }, [cite: 65]
  "795": { cidade: "URUGUAIANA", endereco: "Rua Domingos de Almeida, nº 2.291, bairro Centro" }, [cite: 65]
  "796": { cidade: "SANTA CRUZ DO SUL", endereco: "Avenida Deputado Euclydes Nicolau Kliemann, nº 721, bairro Ana Nery" }, [cite: 65]
  "797": { cidade: "NOVO HAMBURGO", endereco: "Rua Joaquim Pedro Soares, nº 907" }, [cite: 65]
  "798": { cidade: "CAXIAS DO SUL", endereco: "Rua Treze de Maio, nº 996, bairro Cristo Redentor" }, [cite: 65]
  "820": { cidade: "SANTA MARIA", endereco: "Avenida Borges de Medeiros, nº 1.955" }, [cite: 65]
  "821": { cidade: "ALVORADA", endereco: "Avenida Presidente Getúlio Vargas, nº 321" }, [cite: 65]
  "824": { cidade: "SANTA MARIA", endereco: "Avenida Prefeito Evandro Behr, nº 6.665" }, [cite: 65]
  "826": { cidade: "PORTO ALEGRE", endereco: "Praça Lima Duarte, nº 09 – Loja 1" }, [cite: 65]
  "828": { cidade: "PORTO ALEGRE", endereco: "R Silva Jardim, 277" }, [cite: 65]
  "829": { cidade: "PORTO ALEGRE", endereco: "Avenida Coronel Marcos, nº 2.523, bairro Pedra Redonda" }, [cite: 65]
  "830": { cidade: "PORTO ALEGRE", endereco: "R. Antônio Carlos Berta,151 loja 03" }, [cite: 66]
  "831": { cidade: "PORTO ALEGRE", endereco: "Av. Icaraí, 1440" }, [cite: 66]
  "832": { cidade: "RIO GRANDE", endereco: "Rua Val Porto, nº 393, bairro Parque Residencial Salgado Filho" }, [cite: 66]
  "833": { cidade: "GRAVATAÍ", endereco: "Av Dorival Candido Luz de Oliveira, 3527 Bairro São Jeronimo" }, [cite: 66]
  "834": { cidade: "CAXIAS DO SUL", endereco: "Av. Bom Pastor, 477" }, [cite: 67]
  "835": { cidade: "NOVA PETROPOLIS", endereco: "Avenida Quinze de Novembro, nº 1.389 – Loja 1" }, [cite: 67]
  "836": { cidade: "IMBE", endereco: "Av Paraguassu, 7088" }, [cite: 67]
  "837": { cidade: "LAJEADO", endereco: "R Saldanha Marinho, 359" }, [cite: 67]
  "838": { cidade: "PORTO ALEGRE", endereco: "Av. BENTO GONCALVES, n° 1313" }, [cite: 68]
  "839": { cidade: "BENTO GONCALVES", endereco: "AV OSVALDO ARANHA, 740" }, [cite: 68]
  "840": { cidade: "LAJEADO", endereco: "Av. Sen. Alberto Pasqualini , 1605" }, [cite: 68]
  "842": { cidade: "CAXIAS DO SUL", endereco: "Rua Bortolo Zani, 760" }, [cite: 68]
  "843": { cidade: "PORTO ALEGRE", endereco: "Av Grecia, 789, Bairro Passo Da Areia" }, [cite: 68]
  "845": { cidade: "Canoas", endereco: "Rua Frederico Guilherme Ludwig, nº 370 – Loja 01" }, [cite: 68]
  "848": { cidade: "VENANCIO AIRES", endereco: "Rua 15 de Novembro, 1321" }, [cite: 68]
  "853": { cidade: "TRAMANDAI", endereco: "Av Fernandes Bastos, 857" }, [cite: 68]
  "855": { cidade: "PORTO ALEGRE", endereco: "Avenida Coronel Lucas de Oliveira 740" }, [cite: 68]
  "858": { cidade: "GRAVATAÍ", endereco: "R Doutor Luiz Bastos Do Prado, 1888" }, [cite: 68]
  "859": { cidade: "PELOTAS", endereco: "R Rafael Pinto Bandeira, 1376" }, [cite: 68]
  "864": { cidade: "ENCANTADO", endereco: "R Julio De Castilhos, 1304" }, [cite: 68]
  "867": { cidade: "CANOAS", endereco: "AV. DOUTOR SEZEFREDO AZAMBUJA VIEIRA, 2349" }, [cite: 69]
  "868": { cidade: "PORTO ALEGRE", endereco: "Av Economista Nilo Wulff, 215" }, [cite: 69]
  "869": { cidade: "OSÓRIO", endereco: "R Manoel Marques Da Rosa, 1077" }, [cite: 69]
  "870": { cidade: "SAO LEOPOLDO", endereco: "Av Feitoria, 4355" }, [cite: 69]
  "875": { cidade: "TAPEJARA", endereco: "Av. Sete de Setembro, 1205" }, [cite: 70]
  "876": { cidade: "PORTO ALEGRE", endereco: "AV. JUCA BATISTA, 4381" }, [cite: 70]
  "877": { cidade: "PORTO ALEGRE", endereco: "R Portugal, 691" }, [cite: 70]
  "878": { cidade: "MARAU", endereco: "R Bento Goncalves, 725" }, [cite: 70]
  "879": { cidade: "FARROUPILHA", endereco: "R Quatorze De Julho, 202" }, [cite: 70]
  "880": { cidade: "PORTO ALEGRE", endereco: "Av Ijui, 160" }, [cite: 70]
  "881": { cidade: "NÃO-ME-TOQUE", endereco: "Av Alto Do Jacui, 504" }, [cite: 70]
  "883": { cidade: "GRAMADO", endereco: "Av. Das Hortensias, 880" }, [cite: 71]
  "884": { cidade: "SANTA ROSA", endereco: "Av Santa Cruz, 1049" }, [cite: 71]
  "885": { cidade: "PORTO ALEGRE", endereco: "Av Plinio Brasil Milano, 1313" }, [cite: 71]
  "887": { cidade: "PORTO ALEGRE", endereco: "Avenida Ipiranga, 7624 - Loja 01" }, [cite: 71]
  "888": { cidade: "PORTO ALEGRE", endereco: "Rua Barão do Amazonas, 716" }, [cite: 71]
  "889": { cidade: "CACHOEIRINHA", endereco: "Av General Flores Da Cunha, 1546" }, [cite: 71]
  "891": { cidade: "PORTO ALEGRE", endereco: "Av. Severo Dullius, n° 90.010 – LUC T1N2046 – Terminal" }, [cite: 72]
  "894": { cidade: "CAPAO DA CANOA", endereco: "Avenid Paraguassu, 690" }, [cite: 72]
  "896": { cidade: "DOIS IRMÃOS", endereco: "Av Sao Miguel, 854" }, [cite: 72]
  "897": { cidade: "NOVO HAMBURGO", endereco: "Rua Ícaro, 1810" }, [cite: 72]
  "899": { cidade: "TORRES", endereco: "Av Benjamin Constant, 681" }, [cite: 72]
  "912": { cidade: "PORTO ALEGRE", endereco: "Rua Felipe De Oliveira, 465" }, [cite: 72]
  "913": { cidade: "FLORES DA CUNHA", endereco: "R Doutor Montaury, 617" }, [cite: 72]
  "914": { cidade: "PORTO ALEGRE", endereco: "R Tomaz Gonzaga, 320" }, [cite: 72]
  "915": { cidade: "GUAÍBA", endereco: "Av Nestor De Moura Jardim, 680" }, [cite: 72]
  "920": { cidade: "TRÊS COROAS", endereco: "R 12 De Maio, 234" }, [cite: 72]
  "922": { cidade: "PORTO ALEGRE", endereco: "Avenida Rodrigues da Fonseca, 1509 - Loja 06" }, [cite: 72]
  "926": { cidade: "RIO GRANDE", endereco: "Avenida Rio Grande, n° 551, bairro Cassino" }, [cite: 72]
  "927": { cidade: "CAXIAS DO SUL", endereco: "RUA DOM JOSE BAREA, Nº 1888 - BAIRRO: EXPOSICAO" }, [cite: 72]
  "928": { cidade: "PASSO FUNDO", endereco: "Av Brasil Leste, 610" }, [cite: 72]
  "930": { cidade: "SANTIAGO", endereco: "Rua Sete De Setembro, 226" }, [cite: 72]
  "934": { cidade: "GRAVATAI", endereco: "Avenida Jose Loureiro Da Silva, N° 2663, Bairro Centro" }, [cite: 72]
  "936": { cidade: "PORTO ALEGRE", endereco: "Rua Quintino Bocaiuva, n° 483" }, [cite: 72]
  "937": { cidade: "ERECHIM", endereco: "Avenida Jose Oscar Salazar, 307" }, [cite: 72]
  "942": { cidade: "BENTO GONCALVES", endereco: "Rua Guilherme Fasolo, n° 987" }, [cite: 73]
  "943": { cidade: "CARAZINHO", endereco: "Av Pátrica ,600" }, [cite: 73]
  "944": { cidade: "SANTA MARIA", endereco: "Rua Dezessete de Maio, 430" }, [cite: 73]
  "945": { cidade: "SANTA CRUZ DO SUL", endereco: "Coronel Oscar Rafael Jost, 680" }, [cite: 73]
  "946": { cidade: "Panambi", endereco: "R.Sete de Setembro ,211" }, [cite: 73]
  "999": { cidade: "Eldorado do Sul", endereco: "PANVEL MATRIZ EDS" }, [cite: 73]
  "1002": { cidade: "Eldorado do Sul", endereco: "Avenida Industrial Belgraf, 865" }, [cite: 73]
  "1021": { cidade: "Eldorado do Sul", endereco: "AV Julio Ricardo Mottin, 400 - Bairro: Industrial" } [cite: 73]
};

const getBranchInfo = (ident: string) => {
  // Extract numbers from something like "Filial 1" or "001"
  const idNum = ident.replace(/\D/g, '').replace(/^0+/, '');
  return FILIAIS[idNum] || null;
};

// --- Utils ---
const conv = (h: string) => {
  if (!h) return null;
  const [H, M] = h.split(':').map(Number);
  return H * 60 + M;
};

const fmt = (min: number) => {
  const H = Math.floor(min / 60);
  const M = min % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
};

export default function App() {
  // --- State ---
  const [qtd, setQtd] = useState(1);
  const [filial, setFilial] = useState('');

  const [actions, setActions] = useState<Actions>({
    alterarHorario: false,
    baixaFarma: false,
    inclusaoFarma: false,
  });

  const [baixaDetails, setBaixaDetails] = useState<BaixaDetails>({
    nome: '',
    motivo: 'Desligamento',
    filialDestino: '',
  });

  const [abertura, setAbertura] = useState<ScheduleRow>({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });
  const [fechamento, setFechamento] = useState<ScheduleRow>({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });

  const initialScheduleRow = (): ScheduleRow => ({
    seg: '', ter: '', qua: '', qui: '', sex: '', sab: '', dom: ''
  });

  const [showPopup, setShowPopup] = useState(false);

  const [pharmacists, setPharmacists] = useState<Pharmacist[]>(
    Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      nome: '',
      cpf: '',
      crf: '',
      dataNascimento: '',
      tipoInclusao: 'Já vinculado',
      filialOrigem: '',
      entrada: initialScheduleRow(),
      intervalo: initialScheduleRow(),
      retorno: initialScheduleRow(),
      saida: initialScheduleRow(),
    }))
  );

  const [validationResult, setValidationResult] = useState<{
    text: string;
    type: 'idle' | 'success' | 'error' | 'warning';
    canGeneratePdf: boolean;
    totalHours: number[];
  }>({
    text: '',
    type: 'idle',
    canGeneratePdf: false,
    totalHours: [],
  });

  // --- Effects ---
  useEffect(() => {
    // Reset state if input changes
    setValidationResult(prev => ({ 
      ...prev, 
      canGeneratePdf: false, 
      text: prev.text ? "⚠️ Alteração detectada. Valide novamente para baixar." : "",
      type: prev.text ? 'warning' : 'idle'
    }));
  }, [qtd, filial, actions, baixaDetails, abertura, fechamento, pharmacists]);

  const isStep1Done = filial.trim().length > 0;
  const isStep2Done = actions.alterarHorario || actions.baixaFarma || actions.inclusaoFarma;
  const isStep3Done = qtd > 0;
  const isEverythingUnlocked = isStep1Done && isStep2Done && isStep3Done;

  // --- Handlers ---
  const handleCopyRow = (row: ScheduleRow, setter: (val: ScheduleRow) => void) => {
    const val = row.seg;
    if (val) {
      setter({
        seg: val, ter: val, qua: val, qui: val, sex: val, sab: val, dom: val
      });
    }
  };

  const handleCopyFarmaRow = (farmaId: number, field: keyof Pharmacist, day: Day) => {
    setPharmacists(prev => prev.map(f => {
      if (f.id === farmaId) {
        const row = f[field] as ScheduleRow;
        const val = row[day];
        if (val) {
          const newRow = { seg: val, ter: val, qua: val, qui: val, sex: val, sab: val, dom: val };
          return { ...f, [field]: newRow };
        }
      }
      return f;
    }));
  };

  const updatePharmacist = (id: number, updates: Partial<Pharmacist>) => {
    setPharmacists(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const updateFarmaSchedule = (id: number, field: 'entrada' | 'intervalo' | 'retorno' | 'saida', day: Day, val: string) => {
    setPharmacists(prev => prev.map(f => {
      if (f.id === id) {
        return { ...f, [field]: { ...f[field], [day]: val } };
      }
      return f;
    }));
  };

  const validarSemana = () => {
    let totalHours = Array(qtd).fill(0);
    let alertasCli: string[] = [];
    let avisosAmarelos: string[] = [];
    let lacunasGerais: string[] = [];

    // Transfer checks
    const transferErrors: string[] = [];
    if (actions.inclusaoFarma) {
      pharmacists.slice(0, qtd).forEach(f => {
        if (f.tipoInclusao === 'Transferido') {
          if (!f.filialOrigem.trim()) {
            transferErrors.push(`F${f.id}: Informe a Filial de Origem para inclusão por transferência.`);
          }
          if (!f.crf.trim()) {
            transferErrors.push(`F${f.id}: Informe o CRF/RS para inclusão por transferência.`);
          }
        }
      });
    }

    DAYS.forEach(d => {
      const openTime = conv(abertura[d]);
      let closeTime = conv(fechamento[d]);

      if (openTime !== null && closeTime !== null) {
        if (closeTime === 0) closeTime = 1440;
        const rangeFechamento = (closeTime < openTime) ? closeTime + 1440 : closeTime;
        const minutosCobertos = new Array(rangeFechamento - openTime).fill(0);

        for (let pIdx = 0; pIdx < qtd; pIdx++) {
          const f = pharmacists[pIdx];
          const e = conv(f.entrada[d]);
          const i = conv(f.intervalo[d]);
          const r = conv(f.retorno[d]);
          let s = conv(f.saida[d]);

          if (e !== null && s !== null) {
            if (s === 0) s = 1440;
            const sEfetiva = (s < e) ? s + 1440 : s;
            const jornadaBruta = sEfetiva - e;
            const pI = (i !== null) ? i : -1;
            const pR = (r !== null) ? r : -1;

            if (i !== null && r !== null) {
              const duracaoPausa = (r < i) ? (r + 1440 - i) : (r - i);
              const tempoAteIntervalo = (i < e) ? (i + 1440 - e) : (i - e);

              if (tempoAteIntervalo < 120) {
                avisosAmarelos.push(`F${f.id} ${d.toUpperCase()}: Intervalo feito muito cedo (${fmt(tempoAteIntervalo)} de trabalho).`);
              }

              if (jornadaBruta > 360) {
                if (duracaoPausa < 60 || duracaoPausa > 120) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo irregular (${duracaoPausa}min) para jornada > 6h.`);
                }
                if (tempoAteIntervalo > 360) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo feito após ${fmt(tempoAteIntervalo)} de trabalho (deve ser antes de 6h).`);
                }
              } else {
                if (duracaoPausa > 15) {
                  alertasCli.push(`F${f.id} ${d.toUpperCase()}: Intervalo de ${duracaoPausa}min excede o limite de 15min para jornada < 6h.`);
                }
              }
              totalHours[pIdx] += (jornadaBruta - duracaoPausa);
            } else {
              totalHours[pIdx] += jornadaBruta;
            }

            for (let m = openTime; m < rangeFechamento; m++) {
              const mNormal = m % 1440;
              const dentroJornada = (s < e) ? (mNormal >= e || mNormal < s) : (mNormal >= e && mNormal < s);
              let dentroIntervalo = false;
              if (pI !== -1 && pR !== -1) {
                dentroIntervalo = (pR < pI) ? (mNormal >= pI || mNormal < pR) : (mNormal >= pI && mNormal < pR);
              }
              if (dentroJornada && !dentroIntervalo) minutosCobertos[m - openTime]++;
            }
          }
        }

        let inicioLacuna = -1;
        for (let m = 0; m < minutosCobertos.length; m++) {
          if (minutosCobertos[m] === 0 && inicioLacuna === -1) inicioLacuna = m + openTime;
          if (minutosCobertos[m] > 0 && inicioLacuna !== -1) {
            lacunasGerais.push(`${d.toUpperCase()}: Lacuna das ${fmt(inicioLacuna % 1440)} às ${fmt((m + openTime) % 1440)}`);
            inicioLacuna = -1;
          }
        }
        if (inicioLacuna !== -1) lacunasGerais.push(`${d.toUpperCase()}: Lacuna das ${fmt(inicioLacuna % 1440)} às ${fmt(rangeFechamento % 1440)}`);
      }
    });

    let canGenerate = transferErrors.length === 0 && lacunasGerais.length === 0 && alertasCli.length === 0;
    
    let relatorio = "RESUMO DA SEMANA:\n" + totalHours.map((h, i) => `Farma ${i + 1}: ${Math.floor(h / 60)}h${h % 60}min`).join("\n");
    
    if (!canGenerate) {
      relatorio += "\n\n⚠️ BLOQUEADO: Resolva os problemas abaixo para gerar o PDF.\n";
      if (transferErrors.length > 0) relatorio += "\nERROS DE MOVIMENTAÇÃO:\n" + transferErrors.join("\n");
      if (lacunasGerais.length > 0) relatorio += "\nLACUNAS:\n" + lacunasGerais.join("\n");
      if (alertasCli.length > 0) relatorio += "\n\nALERTAS CLT (IMPEDEM PDF):\n" + alertasCli.join("\n");
    } else {
      relatorio += "\n\n✅ COBERTURA COMPLETA E CLT OK: PDF Liberado.";
    }

    if (avisosAmarelos.length > 0) {
      relatorio += "\n\n⚠️ AVISO:\n" + avisosAmarelos.join("\n");
    }

    if (canGenerate && actions.inclusaoFarma) {
      const hasNewHiring = pharmacists.slice(0, qtd).some(f => f.tipoInclusao === 'Nova contratação');
      if (hasNewHiring) {
        setShowPopup(true);
      }
    }

    setValidationResult({
      text: relatorio,
      type: canGenerate ? (avisosAmarelos.length > 0 ? 'warning' : 'success') : 'error',
      canGeneratePdf: canGenerate,
      totalHours,
    });

    // Automatically trigger PDF generation if successful
    if (canGenerate) {
      gerarPDF();
    }
  };

  const limparTudo = () => {
    setQtd(1);
    setFilial('');
    setActions({ alterarHorario: false, baixaFarma: false, inclusaoFarma: false });
    setBaixaDetails({ nome: '', motivo: 'Desligamento', filialDestino: '' });
    setAbertura(initialScheduleRow());
    setFechamento(initialScheduleRow());
    setPharmacists(prev => prev.map(f => ({
      ...f,
      nome: '',
      cpf: '',
      tipoInclusao: 'Antigo',
      filialOrigem: '',
      entrada: initialScheduleRow(),
      intervalo: initialScheduleRow(),
      retorno: initialScheduleRow(),
      saida: initialScheduleRow(),
    })));
    setValidationResult({ text: '', type: 'idle', canGeneratePdf: false, totalHours: [] });
  };

  const downloadBlob = (bytes: Uint8Array, name: string) => {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const gerarPDF = async () => {
    try {
      // 1. Gerar Tabela de Horários Principal
      const responseMain = await fetch(TEMPLATE_PDF_URL);
      if (!responseMain.ok) throw new Error(`Não foi possível carregar 'template.pdf' (status ${responseMain.status}). Verifique se o arquivo está na pasta public/.`);
      const contentTypeMain = responseMain.headers.get('content-type') || '';
      if (!contentTypeMain.includes('pdf') && !contentTypeMain.includes('octet-stream')) {
        throw new Error(`O arquivo 'template.pdf' não foi encontrado na pasta public/ (recebido: ${contentTypeMain}).`);
      }
      const bytesMain: ArrayBuffer = await responseMain.arrayBuffer();
      
      const pdfDocMain = await PDFDocument.load(bytesMain);
      const formMain = pdfDocMain.getForm();

      const setFMain = (f: string, v: string) => { 
        try { 
          const field = formMain.getTextField(f);
          field.setText(v || ""); 
        } catch (e) {} 
      };

      // Preencher horários da filial
      DAYS.forEach(d => {
        const dayUpper = d.toUpperCase();
        setFMain(`${dayUpper}_A`, abertura[d]);
        setFMain(`${dayUpper}_S`, fechamento[d]);
      });

      // Preencher dados dos farmacêuticos (F1 a F6)
      pharmacists.slice(0, qtd).forEach((f) => {
        const n = f.id;
        setFMain(`F${n}_NOME`, f.nome);
        setFMain(`F${n}_CPF`, f.cpf);
        setFMain(`F${n}_NASC`, f.dataNascimento);

        DAYS.forEach(d => {
          const dayUpper = d.toUpperCase();
          const dayPrefix = `F${n}_${dayUpper}`;
          setFMain(`${dayPrefix}_E`, f.entrada[d]);
          setFMain(`${dayPrefix}_I`, f.intervalo[d]);
          setFMain(`${dayPrefix}_R`, f.retorno[d]);
          setFMain(`${dayPrefix}_S`, f.saida[d]);
        });
      });

      const mainPdfBytes = await pdfDocMain.save();
      downloadBlob(mainPdfBytes, `Escala_${filial || 'Filial'}.pdf`);

      // 2. Gerar Declarações de Transferência Individuais
      const currentBranchData = getBranchInfo(filial);

      for (const f of pharmacists.slice(0, qtd)) {
        if (f.tipoInclusao === 'Transferido') {
          try {
            let bytesDec: ArrayBuffer | null = null;

            const responseDec = await fetch(DECLARACAO_PDF_URL);
            const contentTypeDec = responseDec.headers.get('content-type') || '';
            if (responseDec.ok && (contentTypeDec.includes('pdf') || contentTypeDec.includes('octet-stream'))) {
              bytesDec = await responseDec.arrayBuffer();
            }

            if (bytesDec) {
              const pdfDocDec = await PDFDocument.load(bytesDec);
              const formDec = pdfDocDec.getForm();
              
              const setFDec = (name: string, val: string) => {
                try {
                  const field = formDec.getTextField(name);
                  field.setText(val || "");
                } catch (e) {}
              };

              // Fill Name in F1_T (multiple fields possible)
              formDec.getFields().forEach(pdfField => {
                if (pdfField.getName() === 'F1_T' && pdfField.constructor.name === 'PDFTextField') {
                  (pdfField as any).setText(f.nome);
                }
              });

              // CRF
              setFDec("CRF_T", f.crf);

              // Origin Address Lookup
              const originBranchData = getBranchInfo(f.filialOrigem);
              if (originBranchData) {
                setFDec("END_ORIGEM", `${originBranchData.endereco}, ${originBranchData.cidade}`);
              } else {
                setFDec("END_ORIGEM", f.filialOrigem); // Fallback to raw input
              }

              // Final Address Lookup
              if (currentBranchData) {
                setFDec("END_FINAL", `${currentBranchData.endereco}, ${currentBranchData.cidade}`);
              } else {
                setFDec("END_FINAL", filial); // Fallback
              }

              const decPdfBytes = await pdfDocDec.save();
              downloadBlob(decPdfBytes, `Declaracao_Transferencia_${f.nome.split(' ')[0]}.pdf`);
            } else {
              console.warn("Modelo 'declaracao.pdf' não encontrado para o funcionário transferido.");
            }
          } catch (decErr) {
            console.error("Erro ao gerar declaração para: " + f.nome, decErr);
          }
        }
      }

      alert("Processamento concluído! Verifique seus downloads.");
      if (confirm("Assinaturas necessárias!! \n\nDirecionar para o site GOV?")) {
        window.open("https://www.gov.br/pt-br/servicos/assinatura-eletronica?origem=maisacessado_home", "_blank");
      }
    } catch (err) {
      alert("Erro ao processar PDFs: " + (err as Error).message);
    }
  };

  // --- Render Helpers ---
  const renderScheduleInputs = (label: string, row: ScheduleRow, setter: (val: ScheduleRow) => void) => (
    <tr key={label}>
      <td className="ph-title text-left pl-2.5 font-semibold">{label}</td>
      {DAYS.map(d => (
        <td key={d}>
          <input 
            type="time" 
            value={row[d]} 
            onChange={e => setter({ ...row, [d]: e.target.value })}
            className="w-[92%]"
          />
        </td>
      ))}
      <td className="w-[45px]">
        <button 
          onClick={() => handleCopyRow(row, setter)}
          className="p-1 px-2 cursor-pointer bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Copiar primeira coluna para todas"
        >
          <ClipboardCopy size={16} />
        </button>
      </td>
    </tr>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 font-sans text-slate-100 antialiased overflow-hidden">
      <div className="relative w-full h-full max-w-[1240px] max-h-[920px] glass-panel rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-700">
        
        {/* Header - Centered Filial */}
        <header className="flex flex-col items-center justify-center p-2 border-b border-white/10 shrink-0 bg-white/5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-light tracking-widest text-white uppercase opacity-80">Validador Semanal de Horários</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-indigo-500/10 p-2 px-8 rounded-2xl border border-indigo-400/30 shadow-indigo-500/10 shadow-xl">
            <span className="text-xs font-black uppercase text-indigo-300 tracking-tighter">Filial:</span>
            <input 
              type="text" 
              placeholder="Identificação da Filial"
              value={filial} 
              onChange={e => setFilial(e.target.value)}
              className="bg-transparent border-b-2 border-indigo-400 text-lg py-0.5 px-3 focus:outline-none focus:border-white w-72 text-center text-white font-black"
            />
          </div>
        </header>

        {/* Global Controls & Actions - Reordered Step 2 & 3 */}
        <section className={`p-4 grid grid-cols-12 gap-6 shrink-0 border-b border-white/10 transition-all ${!isStep1Done ? 'locked-section' : 'unlocked-section'}`}>
          
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
               Ações Desejadas
            </p>
            <div className="grid grid-cols-1 gap-2">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.alterarHorario ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.alterarHorario && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.alterarHorario} 
                    onChange={e => setActions(prev => ({ ...prev, alterarHorario: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.alterarHorario ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Alterar horário</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.baixaFarma ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.baixaFarma && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.baixaFarma} 
                    onChange={e => setActions(prev => ({ ...prev, baixaFarma: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.baixaFarma ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Baixa de farmacêutico</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-5 h-5 rounded-lg border-2 border-white/20 flex items-center justify-center transition-all ${actions.inclusaoFarma ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-white/5 group-hover:border-white/40'}`}>
                  {actions.inclusaoFarma && <CheckCircle size={14} className="text-white" />}
                  <input 
                    type="checkbox" 
                    checked={actions.inclusaoFarma} 
                    onChange={e => setActions(prev => ({ ...prev, inclusaoFarma: e.target.checked }))}
                    className="hidden" 
                  />
                </div>
                <span className={`text-[11px] font-bold uppercase transition-colors ${actions.inclusaoFarma ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>Inclusão de farmacêutico</span>
              </label>
            </div>
          </div>

          <div className={`col-span-12 lg:col-span-3 flex flex-col gap-3 border-l border-white/10 pl-6 transition-all ${!isStep2Done ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
               Quantidade de farmacêuticos na filial
            </p>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-2 hover:bg-white/10 transition-colors">
              <select 
                value={qtd} 
                onChange={e => setQtd(Number(e.target.value))}
                className="bg-transparent text-lg font-bold outline-none border-none p-0 cursor-pointer text-white w-full"
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n} className="bg-[#1e1b4b]">{n}</option>)}
              </select>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col gap-3 border-l border-white/10 pl-6">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
               Formulário de Movimentação
            </p>
            
            <AnimatePresence mode="wait">
              {actions.baixaFarma ? (
                <motion.div 
                  key="baixa-form"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="bg-red-500/5 p-3 rounded-xl border border-red-500/20 space-y-3"
                >
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <UserMinus size={14} /> Formulário de baixa
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] uppercase opacity-60 font-bold">Farma a ser baixado</label>
                      <input 
                        type="text" 
                        value={baixaDetails.nome} 
                        onChange={e => setBaixaDetails(p => ({ ...p, nome: e.target.value }))}
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs focus:bg-white/10 outline-none focus:border-red-500/50"
                        placeholder="Nome Completo"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] uppercase opacity-60 font-bold">Motivo</label>
                      <select 
                        value={baixaDetails.motivo}
                        onChange={e => setBaixaDetails(p => ({ ...p, motivo: e.target.value as any }))}
                        className="bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200"
                      >
                        <option value="Desligamento" className="bg-[#0f172a]">Desligamento</option>
                        <option value="Transferência" className="bg-[#0f172a]">Transferência</option>
                      </select>
                    </div>
                  </div>
                  {baixaDetails.motivo === 'Transferência' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="flex flex-col gap-1.5 pt-2"
                    >
                      <label className="text-[8px] uppercase opacity-60 font-bold">Filial Destino</label>
                      <input 
                        type="text" 
                        value={baixaDetails.filialDestino} 
                        onChange={e => setBaixaDetails(p => ({ ...p, filialDestino: e.target.value }))}
                        className="bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-red-500"
                        placeholder="Número ou Nome da Filial"
                      />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <div className="h-[90px] flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10">
                  <p className="text-[10px] text-slate-500 italic">Informações de baixa serão solicitadas aqui</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Schedule Table Area */}
        <div className={`flex-1 p-4 overflow-hidden flex flex-col transition-all ${!isEverythingUnlocked ? 'locked-section blur-sm' : 'unlocked-section'}`}>
          <div className="flex-1 w-full border border-white/10 rounded-2xl overflow-hidden bg-black/30 flex flex-col shadow-2xl">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-[11px] border-collapse min-w-[1000px] table-fixed">
                <thead className="bg-white/10 text-indigo-200 sticky top-0 uppercase tracking-tighter z-10 backdrop-blur-md">
                  <tr>
                    <th colSpan={2} className="p-4 w-[280px] border-r border-white/5 font-black text-[10px]">Informações / Período</th>
                    {DAYS.map(day => <th key={day} className="p-2 text-center border-r border-white/5 font-black text-[10px] w-[100px] min-w-[100px]">{day.toUpperCase()}</th>)}
                    <th className="p-4 text-center w-14 min-w-[56px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Store Status Rows */}
                  <tr className="bg-indigo-500/5 group border-b-2 border-indigo-500/20">
                    <td colSpan={2} className="p-4 border-r border-white/5 w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
                        <div>
                          <p className="font-black text-white text-xs uppercase tracking-tighter">Abertura Filial</p>
                          <p className="text-[9px] text-indigo-300/60 uppercase font-black">Horário da Loja</p>
                        </div>
                      </div>
                    </td>
                    {DAYS.map(d => (
                      <td key={d} className="p-3 w-[100px] min-w-[100px]">
                        <input 
                          type="time" 
                          value={abertura[d]} 
                          onChange={e => setAbertura({ ...abertura, [d]: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 focus:bg-indigo-500/10 outline-none text-white font-bold text-sm shadow-inner focus:border-indigo-500/50 transition-all"
                        />
                      </td>
                    ))}
                    <td className="p-3 text-center w-14 min-w-[56px]">
                      <button onClick={() => handleCopyRow(abertura, setAbertura)} className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-slate-400 transition-all active:scale-90"><ClipboardCopy size={16} /></button>
                    </td>
                  </tr>
                  <tr className="bg-indigo-500/5 group border-b-2 border-indigo-500/20">
                    <td colSpan={2} className="p-4 border-r border-white/5 w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-indigo-500 rounded-full"></div>
                        <div>
                          <p className="font-black text-white text-xs uppercase tracking-tighter">Fechamento Filial</p>
                          <p className="text-[9px] text-indigo-300/60 uppercase font-black">Horário da Loja</p>
                        </div>
                      </div>
                    </td>
                    {DAYS.map(d => (
                      <td key={d} className="p-3 w-[100px] min-w-[100px]">
                        <input 
                          type="time" 
                          value={fechamento[d]} 
                          onChange={e => setFechamento({ ...fechamento, [d]: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 focus:bg-indigo-500/10 outline-none text-white font-bold text-sm shadow-inner focus:border-indigo-500/50 transition-all"
                        />
                      </td>
                    ))}
                    <td className="p-3 text-center w-14 min-w-[56px]">
                      <button onClick={() => handleCopyRow(fechamento, setFechamento)} className="p-2 bg-white/5 hover:bg-white/15 rounded-xl text-slate-400 transition-all active:scale-90"><ClipboardCopy size={16} /></button>
                    </td>
                  </tr>

                  {/* Pharmacists Rows - Restructured for direct alignment */}
                  {pharmacists.slice(0, qtd).map((f) => {
                    const rowConfigs = [
                      { field: 'entrada' as const, label: 'Entrada' },
                      { field: 'intervalo' as const, label: 'Intervalo' },
                      { field: 'retorno' as const, label: 'Retorno do Intervalo' },
                      { field: 'saida' as const, label: 'Saída' }
                    ];

                    return (
                      <React.Fragment key={f.id}>
                        {rowConfigs.map((config, idx) => (
                          <tr key={`${f.id}-${config.field}`} className="bg-indigo-500/[0.03] group/row border-b border-white/5 last:border-b-2">
                            {idx === 0 && (
                              <td rowSpan={4} className="p-3 align-top border-r border-white/5 bg-indigo-500/[0.08] w-[180px]">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center font-black text-indigo-400 border border-white/10 text-[10px]">F{f.id}</div>
                                    <div className="flex-1 min-w-0">
                                      <input 
                                        type="text" 
                                        placeholder="Nome"
                                        value={f.nome} 
                                        onChange={e => updatePharmacist(f.id, { nome: e.target.value })}
                                        className="bg-transparent border-b border-white/10 text-white outline-none focus:border-indigo-400 py-0.5 font-bold text-[11px] w-full truncate"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase font-bold text-slate-500">CPF:</label>
                                      <input 
                                        type="text" 
                                        value={f.cpf} 
                                        onChange={e => updatePharmacist(f.id, { cpf: e.target.value })}
                                        className="bg-black/40 border border-white/5 rounded-md px-2 py-0.5 text-[10px] text-indigo-100 outline-none"
                                      />
                                    </div>
                                    <div className="flex flex-col">
                                      <label className="text-[8px] uppercase font-bold text-slate-500">Nascimento:</label>
                                      <input 
                                        type="text" 
                                        value={f.dataNascimento} 
                                        onChange={e => updatePharmacist(f.id, { dataNascimento: e.target.value })}
                                        className="bg-black/40 border border-white/5 rounded-md px-2 py-0.5 text-[10px] text-indigo-100 outline-none"
                                      />
                                    </div>
                                  </div>

                                  {actions.inclusaoFarma && (
                                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                                      <select 
                                        value={f.tipoInclusao}
                                        onChange={e => updatePharmacist(f.id, { tipoInclusao: e.target.value as any })}
                                        className="bg-emerald-500/10 border border-white/10 rounded-md text-[9px] py-1 px-1.5 outline-none font-bold w-full"
                                      >
                                        <option value="Já vinculado" className="bg-[#0f172a]">Já vinculado</option>
                                        <option value="Nova contratação" className="bg-[#0f172a]">Nova Contratação</option>
                                        <option value="Transferido" className="bg-[#0f172a]">Transferido</option>
                                      </select>
                                      {f.tipoInclusao === 'Transferido' && (
                                        <div className="space-y-1.5 pt-1">
                                          <input 
                                            type="text" 
                                            placeholder="Filial Origem"
                                            value={f.filialOrigem} 
                                            onChange={e => updatePharmacist(f.id, { filialOrigem: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[9px] outline-none w-full border-l-2 border-l-amber-500"
                                          />
                                          <input 
                                            type="text" 
                                            placeholder="CRF/RS:"
                                            value={f.crf} 
                                            onChange={e => updatePharmacist(f.id, { crf: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[9px] outline-none w-full border-l-2 border-l-amber-500"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="p-3 w-[100px] text-[9px] uppercase font-black text-slate-500 border-r border-white/5 bg-indigo-500/[0.02] group-hover/row:text-indigo-300 transition-colors leading-tight min-w-[100px]">
                              {config.label}
                            </td>
                            {DAYS.map(d => (
                              <td key={d} className="p-2 border-r border-white/5 w-[100px] min-w-[100px]">
                                <input 
                                  type="time" 
                                  value={f[config.field][d] as string} 
                                  onChange={e => updateFarmaSchedule(f.id, config.field, d, e.target.value)}
                                  className="bg-white/5 border border-white/10 rounded-lg w-full text-center py-2 outline-none text-slate-100 focus:text-white focus:bg-indigo-500/20 font-bold transition-all text-sm"
                                />
                              </td>
                            ))}
                            <td className="p-2 text-center w-14 min-w-[56px]">
                              <button onClick={() => handleCopyFarmaRow(f.id, config.field, 'seg')} className="p-2 bg-white/5 hover:bg-indigo-500/20 rounded-xl text-slate-500 hover:text-white transition-all"><ClipboardCopy size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Legends */}
            <div className="shrink-0 p-3 flex items-center justify-between bg-black/40 border-t border-white/10">
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-tighter">Conformidade CLT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-tighter">Escala Validada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-[10px] text-red-400 uppercase font-bold tracking-tighter">Lacunas de Cobertura</span>
                </div>
              </div>
              <span className="text-[9px] text-slate-500 italic flex items-center gap-1">
                <AlertCircle size={10} /> Preencha todos os campos obrigatórios para liberar o PDF
              </span>
            </div>
          </div>
        </div>

        {/* Summary & Results Footer */}
        <section className="p-4 flex gap-4 border-t border-white/10 bg-white/5 shrink-0">
          <div className={`flex-1 rounded-xl p-4 border font-mono text-[11px] h-32 overflow-auto custom-scrollbar transition-all ${
            validationResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
            validationResult.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
            validationResult.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
            'bg-black/40 border-white/5 text-slate-400'
          }`}>
            <div className="mb-2 font-bold flex items-center gap-2 text-white">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div> RESUMO DO PROCESSAMENTO:
            </div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {validationResult.text || "> Aguardando dados de entrada..."}
            </div>
          </div>

          <div className="flex flex-col gap-3 w-72">
            <button 
              onClick={validarSemana}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle size={14} />
              Validar Escala
            </button>
            <button 
              disabled={!validationResult.canGeneratePdf}
              onClick={gerarPDF}
              className={`text-xs font-bold py-3 rounded-lg border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                validationResult.canGeneratePdf 
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xl' 
                  : 'bg-black/20 text-slate-600 border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <FileDown size={14} className={validationResult.canGeneratePdf ? "text-indigo-400" : ""} />
              Gerar PDF Preenchido
            </button>
          </div>
        </section>
      </div>

      {/* Nova Contratação Popup */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full glass-panel rounded-3xl p-8 border-2 border-indigo-400/30 shadow-2xl space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center animate-bounce">
                <AlertCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-tight">Aviso de Inclusão Profissional</h2>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-sm font-bold text-indigo-200 uppercase leading-relaxed tracking-wide">
                  NECESSÁRIO ENVIO DA CARTEIRA DE TRABALHO DIGITAL E CONTRATO INTERNO DO FARMACÊUTICO CONTRATADO
                </p>
              </div>
              <button 
                onClick={() => setShowPopup(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-900/40 uppercase tracking-widest text-xs"
              >
                Eu compreendo e irei enviar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background Decorative Blurs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>
    </div>
  );

  function renderFarmaSubRow(f: Pharmacist, field: 'entrada' | 'intervalo' | 'retorno' | 'saida', label: string) {
    return (
      <tr key={`${f.id}-${field}`}>
        <td className="ph-title text-left pl-4 text-xs opacity-80">{label} (F{f.id})</td>
        {DAYS.map(d => (
          <td key={d}>
            <input 
              type="time" 
              value={f[field][d]} 
              onChange={e => updateFarmaSchedule(f.id, field, d, e.target.value)}
              className="w-[92%]"
            />
          </td>
        ))}
        <td>
          <button 
            onClick={() => handleCopyFarmaRow(f.id, field, 'seg')}
            className="p-1 px-2 cursor-pointer bg-white/5 rounded-lg hover:bg-white/15 transition-colors"
          >
            <ClipboardCopy size={14} />
          </button>
        </td>
      </tr>
    );
  }
}
