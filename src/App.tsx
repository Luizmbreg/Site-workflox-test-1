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

const FILIAIS: Record<string, { cidade: string; endereco: string }> = {
  "1": { cidade: "PORTO ALEGRE", endereco: "R. Dr. Flores, 194" },
  "2": { cidade: "PORTO ALEGRE", endereco: "Rua Ramiro Barcelos, nº 910, bloco E" },
  "4": { cidade: "PORTO ALEGRE", endereco: "Av. Borges de Medeiros, 589- e 595" },
  "5": { cidade: "PORTO ALEGRE", endereco: "Av. Azenha, 693" },
  "7": { cidade: "PORTO ALEGRE", endereco: "Av. Azenha, 1.401" },
  "8": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 1983" },
  "9": { cidade: "PORTO ALEGRE", endereco: "Av. Protásio Alves, 2640" },
  "10": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1238" },
  "11": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1401" },
  "12": { cidade: "PORTO ALEGRE", endereco: "Av. Venâncio Aires, 1102" },
  "13": { cidade: "PORTO ALEGRE", endereco: "Rua João Wallig, 1800 Lj. JW 13-Iguatemi" },
  "15": { cidade: "PORTO ALEGRE", endereco: "Av. Borges de Medeiros, 255" },
  "17": { cidade: "PORTO ALEGRE", endereco: "Av. Cristóvão Colombo, 2110" },
  "19": { cidade: "PORTO ALEGRE", endereco: "Avenida São Pedro, 577" },
  "20": { cidade: "PORTO ALEGRE", endereco: "Av. João Pessoa, 1831 – Lj. 1A - 202/203" },
  "21": { cidade: "PORTO ALEGRE", endereco: "Rua Vinte e Quatro de Outubro, 742" },
  "23": { cidade: "PORTO ALEGRE", endereco: "Av. Plínio Brasil Milano, 1000" },
  "25": { cidade: "PORTO ALEGRE", endereco: "Av. São Pedro, 878 – São Geraldo" },
  "28": { cidade: "PORTO ALEGRE", endereco: "Av. Getúlio Vargas, n° 480" },
  "29": { cidade: "PORTO ALEGRE", endereco: "Rua Ramiro Barcelos, 1115" },
  "30": { cidade: "SÃO SEBASTIÃO DO CAI", endereco: "Avenida Egidio Michaelsen, 477, bairro Centro" },
  "31": { cidade: "PORTO ALEGRE", endereco: "Avenida Protásio Alves, 4194 - subsolo" },
  "34": { cidade: "SAO LEOPOLDO", endereco: "Rua Independência, 424" },
  "35": { cidade: "SANTA CRUZ DO SUL", endereco: "Rua Marechal Floriano, 863" },
  "36": { cidade: "BAGE", endereco: "Av. Sete de Setembro, 1121" },
  "37": { cidade: "SANTA VITORIA DO PALMAR", endereco: "Rua Barão do Rio Branco, 439" },
  "38": { cidade: "PORTO ALEGRE", endereco: "Av. Cavalhada, 2955" },
  "40": { cidade: "URUGUAIANA", endereco: "Rua Duque de Caxias, 1625" },
  "41": { cidade: "CRUZ ALTA", endereco: "Avenida General Osório, 150, bairro Centro" },
  "43": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 3522" },
  "44": { cidade: "PORTO ALEGRE", endereco: "Av. Teresópolis, 3126" },
  "45": { cidade: "PORTO ALEGRE", endereco: "Av. Protásio Alves, 723" },
  "47": { cidade: "ALVORADA", endereco: "Avenida Presidente Vargas, nº 1957" },
  "48": { cidade: "PORTO ALEGRE", endereco: "Rua Zeca Neto, 38" },
  "50": { cidade: "ALEGRETE", endereco: "Rua Gaspar Martins, 322" },
  "51": { cidade: "BAGE", endereco: "Rua Monsenhor Hipólito, 02 Lj 01" },
  "52": { cidade: "PELOTAS", endereco: "Rua Andrade Neves, 1881" },
  "53": { cidade: "CACHOEIRA DO SUL", endereco: "Rua Júlio de Castilhos, 102" },
  "54": { cidade: "CAMAQUA", endereco: "Av. Presidente Vargas, 447" },
  "56": { cidade: "CARAZINHO", endereco: "Av. Flores da Cunha, 1421" },
  "57": { cidade: "CAXIAS DO SUL", endereco: "Av. Júlio de Castilhos, 1970" },
  "58": { cidade: "CRUZ ALTA", endereco: "Rua Duque de Caxias, 645 sala 03" },
  "59": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 2696" },
  "60": { cidade: "IJUI", endereco: "Rua XV de Novembro, 386" },
  "61": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Rua dos Andradas, 485" },
  "62": { cidade: "SANTANA DO LIVRAMENTO", endereco: "Rua dos Andradas, 51" },
  "63": { cidade: "PELOTAS", endereco: "Av. General Osório, 1052" },
  "64": { cidade: "RIO GRANDE", endereco: "Rua Marechal Floriano Peixoto, 351" },
  "65": { cidade: "ROSARIO DO SUL", endereco: "R JOAO BRASIL, 831" },
  "66": { cidade: "SANTO ANGELO", endereco: "Rua Marquês do Herval, 1583" },
  "67": { cidade: "SANTA MARIA", endereco: "Rua Acampamento, 150" },
  "68": { cidade: "SAO LOURENCO DO SUL", endereco: "Rua Coronel Alfredo Born, 317" },
  "70": { cidade: "SANTIAGO", endereco: "Rua Getúlio Vargas, 1851" },
  "71": { cidade: "FARROUPILHA", endereco: "R Pinheiro Machado, 195 - Sala 02" },
  "72": { cidade: "SÃO BORJA", endereco: "Rua General Osório, 2160" },
  "73": { cidade: "SAO LUIZ GONZAGA", endereco: "Av. Sen. Pinheiro Machado, 2476" },
  "74": { cidade: "URUGUAIANA", endereco: "Rua Domingos de Almeida, 1946" },
  "75": { cidade: "VACARIA", endereco: "Rua Borges de Medeiros, 1313" },
  "77": { cidade: "DOM PEDRITO", endereco: "Av. Rio Branco, 844" },
  "78": { cidade: "BENTO GONCALVES", endereco: "Rua Marechal Deodoro, 17" },
  "79": { cidade: "ITAQUI", endereco: "Avenida Humberto de Alencar Castelo Branco, nº 1044" },
  "80": { cidade: "TAQUARA", endereco: "Rua Júlio de Castilhos, 2594" },
  "81": { cidade: "TRES PASSOS", endereco: "Av. Júlio de Castilhos, 788" },
  "82": { cidade: "TRAMANDAI", endereco: "Av. Emancipação, 161" },
  "83": { cidade: "TORRES", endereco: "Avenida Barão do Rio Branco, nº 235, bairro Centro" },
  "84": { cidade: "SANTA ROSA", endereco: "Av. Rio Branco, 447" },
  "85": { cidade: "PALMEIRA DAS MISSOES", endereco: "Av. Independência, 1112" },
  "87": { cidade: "PORTO ALEGRE", endereco: "Av. Venâncio Aires, 399, Loja 01" },
  "88": { cidade: "SANTO ANGELO", endereco: "Rua Marquês do Herval, 1118" },
  "91": { cidade: "PELOTAS", endereco: "Rua Santos Dumont, 856" },
  "92": { cidade: "PELOTAS", endereco: "Rua Quinze de Novembro , 454" },
  "93": { cidade: "PELOTAS", endereco: "Rua Santos Dumont, 487" },
  "94": { cidade: "RIO GRANDE", endereco: "Rua Luiz Lórea, 502" },
  "95": { cidade: "RIO GRANDE", endereco: "Rua 24 de Maio, 400/402" },
  "96": { cidade: "JAGUARAO", endereco: "Rua 27 de Janeiro, 408" },
  "97": { cidade: "PELOTAS", endereco: "Rua Andrade Neves, 1575" },
  "98": { cidade: "PELOTAS", endereco: "Av. Bento Gonçalves, 3331" },
  "141": { cidade: "PORTO ALEGRE", endereco: "Av. Doutor Nilo Peçanha, 1737" },
  "142": { cidade: "PORTO ALEGRE", endereco: "Rua Santa Cecília, 1269 – Lj 01" },
  "144": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 4048 - Lj 03" },
  "146": { cidade: "IMBE", endereco: "Avenida Paraguassú, nº 1.474, bairro Centro" },
  "149": { cidade: "RIO PARDO", endereco: "Rua Andrade Neves, 626" },
  "151": { cidade: "PORTO ALEGRE", endereco: "Rua Múcio Teixeira, 680 – Lj 103/104" },
  "153": { cidade: "PORTO ALEGRE", endereco: "Rua Olavo Barreto Viana, 36 – Lj 126" },
  "157": { cidade: "PASSO FUNDO", endereco: "Rua Uruguai, 1620 – Salas 212/213" },
  "159": { cidade: "RIO GRANDE", endereco: "Av. Rio Grande, 162" },
  "160": { cidade: "GRAVATAÍ", endereco: "Av. José Loureiro da Silva, 1504" },
  "161": { cidade: "PORTO ALEGRE", endereco: "Avenida Assis Brasil, nº 164 – SUC 61 e 62" },
  "163": { cidade: "PORTO ALEGRE", endereco: "Av. João Wallig, 1903" },
  "164": { cidade: "PORTO ALEGRE", endereco: "Av. Carlos Gomes, 11 – Lj 03" },
  "165": { cidade: "PORTO ALEGRE", endereco: "Av. Ipiranga, 6690 - Bl 02/Prédio 60/Térreo" },
  "166": { cidade: "PORTO ALEGRE", endereco: "Av. Túlio de Rose, 80 – Loja 129 e 130" },
  "167": { cidade: "PORTO ALEGRE", endereco: "Av. Otto Niemeyer, 2500 - Lojas 103 e 104" },
  "168": { cidade: "PORTO ALEGRE", endereco: "Avenida Mostardeiro, 287" },
  "170": { cidade: "NOVO HAMBURGO", endereco: "Rua 1º de Março, 1111 – Lj 03" },
  "171": { cidade: "PORTO ALEGRE", endereco: "Av. Cavalhada, 3621 – LJ 01" },
  "173": { cidade: "CAXIAS DO SUL", endereco: "Avenida Júlio de Castilhos, nº 2.234, loja 1" },
  "175": { cidade: "CANOAS", endereco: "Rua Quinze de Janeiro, nº 481, salas 214-3 / 214-4 / 214-5" },
  "176": { cidade: "ERECHIM", endereco: "Av. Maurício Cardoso, 17" },
  "178": { cidade: "ESTEIO", endereco: "R Padre Felipe, 257" },
  "179": { cidade: "MARAU", endereco: "Rua Julio Borella, 1067 – Sala 102" },
  "181": { cidade: "CANOAS", endereco: "Rua Tiradentes, 291" },
  "182": { cidade: "PORTO ALEGRE", endereco: "Av. Cristóvão Colombo, 545 – Lj 1224 – Sh Total" },
  "183": { cidade: "PORTO ALEGRE", endereco: "Av. Independência, 155 – Sala 02" },
  "184": { cidade: "PORTO ALEGRE", endereco: "Rua Otto Niemayer, 601 – Tristeza" },
  "186": { cidade: "PORTO ALEGRE", endereco: "Av. Juca Batista, 925 – Lj 101" },
  "187": { cidade: "ESTRELA", endereco: "R RUA TIRADENTES, 248" },
  "188": { cidade: "NOVO HAMBURGO", endereco: "Av. Pedro Adans Filho, 5573" },
  "189": { cidade: "GAROPABA", endereco: "Rua Prefeito João Araújo, 601 – sala 02" },
  "190": { cidade: "CAXIAS DO SUL", endereco: "Rua Vinte de Setembro, 2352 – Lurdes" },
  "191": { cidade: "FLORIANOPOLIS", endereco: "Avenida das Nações, nº 342" },
  "192": { cidade: "PORTO ALEGRE", endereco: "Av. Wenceslau Escobar, 2857 Lj 04" },
  "193": { cidade: "TRAMANDAI", endereco: "Av. Emancipação, 898 – Lj ¾ - Praia" },
  "194": { cidade: "CIDREIRA", endereco: "Av. Mostardeiros, 3213 – Salas 1 e 2" },
  "195": { cidade: "SANTA MARIA", endereco: "Av. Presidente Vargas, 2194" },
  "196": { cidade: "TAPES", endereco: "Av. Assis Brasil, 412" },
  "197": { cidade: "QUARAI", endereco: "Avenida Sete de Setembro, nº 775" },
  "199": { cidade: "CAXIAS DO SUL", endereco: "Rua Borges de Medeiros, 391– Lj 3/4" },
  "301": { cidade: "CAXIAS DO SUL", endereco: "Rodovia RSC 453, KM 3,5 - nº 2780, loja 159" },
  "302": { cidade: "RIO GRANDE", endereco: "Av. Rio Grande, 251" },
  "303": { cidade: "RIO GRANDE", endereco: "Avenida Presidente Vargas, 687" },
  "304": { cidade: "RIO GRANDE", endereco: "Rua Doutor Nascimento, 389, 391 e 399" },
  "124": { cidade: "XANGRILA", endereco: "Av. Paraguassú, 4561" },
  "306": { cidade: "XANGRILA", endereco: "Av. Paraguassú, 1214, Loja 1" },
  "307": { cidade: "PORTO ALEGRE", endereco: "Av. Assis Brasil, 2611 - Sala 102" },
  "308": { cidade: "PORTO ALEGRE", endereco: "Rua José de Alencar, nº 286, Sala 05, bairro Menino Deus" },
  "309": { cidade: "PELOTAS", endereco: "Avenida Dom Joaquim, 680" },
  "310": { cidade: "PORTO ALEGRE", endereco: "Rua Vicente da Fontoura, 2759" },
  "311": { cidade: "PORTO ALEGRE", endereco: "Rua Casemiro de Abreu, 1755 - e 1775" },
  "312": { cidade: "PORTO ALEGRE", endereco: "Rua Marquês do pombal, 565 - Moinhos de Vento" },
  "313": { cidade: "PORTO ALEGRE", endereco: "Avenida Wenceslau Escobar, 1933 - Cristal" },
  "314": { cidade: "PELOTAS", endereco: "Rua Visconde de Ouro Preto, 46 - Areal" },
  "315": { cidade: "OSORIO", endereco: "Av. Paraguassú, 444" },
  "319": { cidade: "SANTA CRUZ DO SUL", endereco: "Rua Thomaz Flores, 206" },
  "320": { cidade: "FLORIANOPOLIS", endereco: "Rua Frei Caneca, 530" },
  "321": { cidade: "PELOTAS", endereco: "Avenida Ferreira Viana, 1526 - Lojas 4, 5 e 6" },
  "322": { cidade: "PORTO ALEGRE", endereco: "Avenida Guaporé, nº 324" },
  "323": { cidade: "PORTO ALEGRE", endereco: "Avenida Cristóvão Colombo, 2999" },
  "324": { cidade: "PORTO ALEGRE", endereco: "Avenida Protásio Alves, 2121" },
  "325": { cidade: "NOVO HAMBURGO", endereco: "Rua Bento Gonçalves, 2917 - Lojas 1 e 2" },
  "326": { cidade: "PORTO ALEGRE", endereco: "Avenida Nilo Peçanha, 3200 - Lojas 48 e 49" },
  "327": { cidade: "SANTA MARIA", endereco: "Avenida Rio Branco, n° 533" },
  "328": { cidade: "FLORIANOPOLIS", endereco: "Avenida Prefeito Osmar Cunha, 313" },
  "330": { cidade: "PORTO ALEGRE", endereco: "Avenida Nilo Peçanha, 95 - Loja A" },
  "332": { cidade: "SÃO JOSÉ", endereco: "Rod. BR 101, KM 211, Esq. SC 407 - Ljs 84, 106 e 107" },
  "333": { cidade: "SAO LEOPOLDO", endereco: "Avenida João Correa, 532" },
  "334": { cidade: "BALNEÁRIO PINHAL", endereco: "Rua Humberto de Alencar Castelo Branco, 374 - Ljs 3 e 4" },
  "335": { cidade: "SANTA MARIA", endereco: "Rua General Neto, 1097" },
  "336": { cidade: "CAXIAS DO SUL", endereco: "Avenida Rio Branco, 425 - Lojas 102 e 103" },
  "337": { cidade: "PELOTAS", endereco: "Avenida Dom Joaquim, nº 603 - Loja 1" },
  "338": { cidade: "PASSO FUNDO", endereco: "Rua Quinze de Novembro, 318" },
  "340": { cidade: "OSORIO", endereco: "Avenida Getúlio Vargas, nº 525" },
  "341": { cidade: "CAPAO DA CANOA", endereco: "Av. Paraguassú, 2786" },
  "343": { cidade: "PORTO ALEGRE", endereco: "Rua Valparaíso, 698" },
  "344": { cidade: "PORTO ALEGRE", endereco: "Av. Plínio Brasil Milano, 1689 - Loja 101" },
  "345": { cidade: "PELOTAS", endereco: "Rua Gonçalves Chaves, 2920" },
  "346": { cidade: "BAGE", endereco: "Avenida Tupy Silveira, 1887 - Sala 01" },
  "347": { cidade: "PORTO ALEGRE", endereco: "Avenida Edgar Pires de Castro, 1395" },
  "348": { cidade: "ARROIO GRANDE", endereco: "Rua Visconde de Mauá, 431" },
  "349": { cidade: "PORTO ALEGRE", endereco: "Avenida Doutor Nilo Peçanha, 690" },
  "350": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 1480" },
  "351": { cidade: "PORTO ALEGRE", endereco: "Avenida Juca Batista, 4255 - SUC 128" },
  "352": { cidade: "URUGUAIANA", endereco: "Rua Quinze de Novembro, 2.755" },
  "353": { cidade: "CAXIAS DO SUL", endereco: "Rua Tronca, 2730" },
  "354": { cidade: "SANTA ROSA", endereco: "Avenida Expedicionário Weber, 805" },
  "355": { cidade: "TORRES", endereco: "Rua Bento Gonçalves, 81" },
  "356": { cidade: "IJUI", endereco: "Rua Doutor Pestana, 20" },
  "357": { cidade: "PORTO ALEGRE", endereco: "Rua Paraguai, 100 loja 104 , Rio Branco" },
  "358": { cidade: "CAXIAS DO SUL", endereco: "Rua Professor Marcos Martini, 480" },
  "359": { cidade: "SANTA MARIA", endereco: "Avenida Nossa Senhora Medianeira, 1318" },
  "360": { cidade: "URUGUAIANA", endereco: "Avenida Presidente Getúlio Vargas, 3307" },
  "361": { cidade: "CARLOS BARBOSA", endereco: "Rua Buarque de Macedo, 3867" },
  "362": { cidade: "ESTEIO", endereco: "Avenida Presidente Vargas, 2358 - Lojas 1 e 2" },
  "363": { cidade: "CAPAO DA CANOA", endereco: "Rua Sepé, 1931" },
  "364": { cidade: "GRAMADO", endereco: "Avenida das Hortênsias, nº 3.860" },
  "365": { cidade: "CANGUÇU", endereco: "Rua General Osório, 1099" },
  "366": { cidade: "GRAMADO", endereco: "Av. das Hortênsias, 1929 - Loja 101" },
  "367": { cidade: "PELOTAS", endereco: "Avenida Ferreira Viana, nº 476" },
  "368": { cidade: "TRAMANDAI", endereco: "Rua Rubem Berta, 1445" },
  "369": { cidade: "PORTO ALEGRE", endereco: "Avenida do Forte, 1396 - Loja 1" },
  "370": { cidade: "GUAIBA", endereco: "Rua Sete de Setembro, 360" },
  "371": { cidade: "DOIS IRMÃOS", endereco: "Avenida 25 de Julho, nº 785" },
  "373": { cidade: "VACARIA", endereco: "Rua Julio de Castilhos, nº 1.063" },
  "374": { cidade: "PORTO ALEGRE", endereco: "Rua Santana, nº 1501, loja 1" },
  "375": { cidade: "LAJEADO", endereco: "Avenida Benjamin Constant, nº 1.707" },
  "376": { cidade: "PORTO ALEGRE", endereco: "Avenida Cavalhada, nº 2351, 2369 e 2373" },
  "378": { cidade: "PORTO ALEGRE", endereco: "Av. Teresópolis, 3487" },
  "379": { cidade: "FLORES DA CUNHA", endereco: "Rua Borges de Medeiros, nº 1.461, salas 01 e 02" },
  "380": { cidade: "BLUMENAU", endereco: "Rua São Paulo, nº 85, loja 2" },
  "381": { cidade: "CRICIÚMA", endereco: "Rua Marechal Deodoro, nº 177" },
  "382": { cidade: "GRAVATAÍ", endereco: "Avenida Dorival Cândido Luz de Oliveira, nº 680" },
  "383": { cidade: "PORTO ALEGRE", endereco: "Rua Vinte e Quatro de Outubro, 1.465" },
  "384": { cidade: "IVOTI", endereco: "Avenida Presidente Lucena, nº 3.040, loja 03" },
  "385": { cidade: "CRICIÚMA", endereco: "Avenida Jorge Elias De Lucca, nº 765, lojas 115 e 116" },
  "386": { cidade: "CAXIAS DO SUL", endereco: "Rua General Malett, 56" },
  "387": { cidade: "CANOAS", endereco: "Avenida Farroupilha, nº 4.545, loja 2.078, Pavimento L2" },
  "389": { cidade: "ELDORADO DO SUL", endereco: "Avenida Getulio Vargas, 274" },
  "390": { cidade: "LAGOA VERMELHA", endereco: "Av. Afonso Pena, 630 sala 14" },
  "391": { cidade: "GAROPABA", endereco: "Rua João Orestes de Araújo, nº 1.253" },
  "392": { cidade: "PORTO ALEGRE", endereco: "Avenida Panamericana, 670" },
  "393": { cidade: "MONTENEGRO", endereco: "Rua José Luiz, nº 1.485," },
  "394": { cidade: "IBIRUBA", endereco: "Rua General Osório, nº 878, sala 01," },
  "395": { cidade: "PASSO FUNDO", endereco: "Avenida Presidente Vargas, 1610 lojas 2004,2005,2006 e 2007" },
  "396": { cidade: "SÃO BORJA", endereco: "Rua General Marques, nº 902, Loja 1" },
  "397": { cidade: "PORTO ALEGRE", endereco: "Rua Sarmento Leite n°876, ljs 880 e 882" },
  "398": { cidade: "SAPUCAIA DO SUL", endereco: "Rua Professor Francisco Brochado da Rocha, nº 393" },
  "399": { cidade: "CANELA", endereco: "Rua João Pessoa, 192" },
  "400": { cidade: "NOVO HAMBURGO", endereco: "Av. Dr. Maurício Cardoso, 833 - Sl 102" },
  "401": { cidade: "PORTO ALEGRE", endereco: "Rua dos Andradas, 914" },
  "402": { cidade: "FLORIANOPOLIS", endereco: "Avenida Pequeno Príncipe, 1650 - Loja 03" },
  "403": { cidade: "CAXIAS DO SUL", endereco: "Rua Alfredo Chaves, 1332 – Suc 001 – Zaffari" },
  "404": { cidade: "SAPIRANGA", endereco: "Rua João Corrêa, 1193" },
  "405": { cidade: "SAO LEOPOLDO", endereco: "Av. Primeiro de Março, 821 – Suc 215" },
  "406": { cidade: "CAXIAS DO SUL", endereco: "Rua Sinimbu, 135 SUC 003" },
  "408": { cidade: "PORTO ALEGRE", endereco: "Coronel Bordini, 12" },
  "411": { cidade: "CAMPO BOM", endereco: "Av. Brasil, 3057" },
  "412": { cidade: "CANELA", endereco: "Rua Júlio de Castilhos, 509" },
  "414": { cidade: "PORTO ALEGRE", endereco: "Av. Getúlio Vargas, 1714" },
  "415": { cidade: "PORTO ALEGRE", endereco: "Rua Fernandes Vieira, 401 – suc 102" },
  "416": { cidade: "NOVA PETROPOLIS", endereco: "Av. Quinze de Novembro, 1150 – Lj 02" },
  "417": { cidade: "PASSO FUNDO", endereco: "Av. Presidente Vargas, 895" },
  "999": { cidade: "Eldorado do Sul", endereco: "PANVEL MATRIZ EDS" }
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
      // 1. Gerar Tabela de Horários Principal using Base64
      if (!PDF_TEMPLATE_BASE64) {
        throw new Error("Base64 da Tabela de Horários não foi configurado.");
      }
      
      const bytesMain = base64ToArrayBuffer(PDF_TEMPLATE_BASE64);
      const pdfDocMain = await PDFDocument.load(bytesMain);
      const formMain = pdfDocMain.getForm();

      const setFMain = (f: string, v: string) => { 
        try { 
          const field = formMain.getTextField(f);
          field.setText(v || ""); 
        } catch (e) {} 
      };

      // ... (rest of main PDF filling logic F1-F6 remains the same) ...

      const mainPdfBytes = await pdfDocMain.save();
      downloadBlob(mainPdfBytes, `Escala_${filial || 'Filial'}.pdf`);

      // 2. Gerar Declarações de Transferência Individuais using Base64
      const currentBranchData = getBranchInfo(filial);

      for (const f of pharmacists.slice(0, qtd)) {
        if (f.tipoInclusao === 'Transferido') {
          try {
            if (!PDF_DECLARACAO_BASE64) {
               console.warn("Base64 da Declaração não foi configurado.");
               continue;
            }

            const bytesDec = base64ToArrayBuffer(PDF_DECLARACAO_BASE64);
            const pdfDocDec = await PDFDocument.load(bytesDec);
            const formDec = pdfDocDec.getForm();
            
            const setFDec = (name: string, val: string) => {
              try {
                const field = formDec.getTextField(name);
                field.setText(val || "");
              } catch (e) {}
            };

            // ... (rest of declaration filling logic remains the same) ...

            const decPdfBytes = await pdfDocDec.save();
            downloadBlob(decPdfBytes, `Declaracao_Transferencia_${f.nome.split(' ')[0]}.pdf`);
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
            const responseDec = await fetch('/declaracao.pdf');
            if (responseDec.ok) {
              const bytesDec = await responseDec.arrayBuffer();
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
                setFDec("END_ORIGEM", `${originBranchData.cidade}, ${originBranchData.endereco}`);
              } else {
                setFDec("END_ORIGEM", f.filialOrigem); // Fallback to raw input
              }

              // Final Address Lookup
              if (currentBranchData) {
                setFDec("END_FINAL", `${currentBranchData.cidade}, ${currentBranchData.endereco}`);
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
