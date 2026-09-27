# T11 — бодлогыг томьёотой холбох шалгалт

Энэ тайлан зөвхөн шинээр үүсгэсэн `pi_s2_t11` синтетик PostgreSQL сангийн үр дүн. Бодит сурагч, эх материал, production өгөгдөл ашиглаагүй. Суурь: `5202db2`; энэ ажил миграци нэмэхгүй.

## Ажиллуулах

API хавтаснаас эхлээд `npm run build`. Холболтыг оператор өөрөө `DATABASE_URL` орчны хувьсагчаар өгнө. Скрипт `.env` уншихгүй, тайлангаа зөвхөн stdout-д гаргана.

```sh
node prisma/tag-problem-formulas.cjs --help
node prisma/tag-problem-formulas.cjs --only-book=100V3
# Dry-run тайланг шалгасны дараа:
node prisma/tag-problem-formulas.cjs --only-book=100V3 --commit
```

Анхдагч нь DRY-RUN. `--commit` л холбоос нэмнэ. A/B гэж тодорхой заасан sourceVariant-тай, устгаагүй бодлого/бүлэг/ном уншина. C болон танигдаагүй variant-ийн өгүүлбэрийг огт авахгүй. Номгүй бүлгийн бодлогыг бүх номын горимд хамруулна. `--only-book` өгвөл зөвхөн тухайн ном. Хариултын түлхүүр ашиглахгүй.

Сэдэв дангаараа хангалтгүй: өгүүлбэрийн LaTeX/математик нэршил, баталгаажуулах түлхүүр хэллэг эсвэл шинжилгээнд шууд нэрлэсэн томьёо шаардлагатай. Оноо нь зөв арга гэдгийн баталгаа буюу магадлал биш. Шууд нэрлэсэн шинжилгээ хамгийн өндөр жинтэй. Босго 0.5; нэг бодлогод дөрвөөс олон санал гаргахгүй. Холбоогүй бодлогыг хүчээр таахгүй.

## Өөрчлөлтийн аюулгүй байдал

Гараар байсан холбоосыг устгахгүй, солихгүй. Одоо байгаа дөрвөн холбоосын сул зайд л шинэ холбоос нэмнэ; өмнө нь дөрвөөс олон байвал хэвээр үлдээнэ. `createMany(skipDuplicates)` болон нэг бодлого бүрийн Serializable transaction/row lock нь давтан ажиллахад давхардуулахгүй. Сервер талын content update hook-ийг энэ PR өөрчлөөгүй.

Олон бодлогын commit нь нэг том transaction биш. Тасалдвал өмнөх бодлогуудын commit үлдэж болно; дахин ажиллуулахад аюулгүй. Энэ нь операторын зориуд сонгосон append-only backfill. Тайлангийн token/slug ч дотоод мэдээлэл тул production тайланг нийтэд commit хийхгүй.

## Бодит локал туршилтын үр дүн

- 50 A/B бодлого, 2 хориглосон/танигдаагүй variant, 5 томьёо.
- Анхны dry-run: 45 таарсан, 5 холбоосгүй; 89 холбоос нэмэх санал. Базын холбоосын тоо өөрчлөгдөөгүй.
- Эхний commit: 89 холбоос нэмсэн; өмнөх 4 гараар оноосон холбоос бүгд хадгалагдсан.
- Давтан commit: 0 холбоос нэмсэн.
- Хоёр процессыг зэрэг ажиллуулах туршилт: нийлээд яг 89 нэмсэн, давхардалгүй, нэг бодлогод 4-өөс хэтрээгүй.
- Доорх нь commit-уудын дараах жинхэнэ CLI DRY-RUN. 30 жишээг криптограф random reservoir sampling-ээр авсан; өгүүлбэр, сонголт, зөв хариулт тайланд байхгүй.

```json
{
  "mode": "DRY_RUN",
  "onlyBook": "100V3",
  "formulaCatalogCount": 5,
  "excludedSourceCount": 2,
  "eligibleProblems": 50,
  "matchedProblems": 45,
  "suggestedLinks": 91,
  "existingLinks": 93,
  "additions": 0,
  "insertedLinks": 0,
  "unmatchedProblems": 5,
  "formulas": {
    "discriminant": 1,
    "quadratic-root-formula": 45,
    "vieta": 45
  },
  "unmatchedByTopic": {
    "RATEQ": 5
  },
  "samples": [
    {
      "token": "100V3-RATEQ-B-042",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-B-046",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-002",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-003",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-004",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-005",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-039",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-007",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-008",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-037",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-B-041",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-B-044",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-B-048",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-013",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-014",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-015",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-016",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-017",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-018",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-019",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-020",
      "suggestions": [],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-021",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-022",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-023",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-B-045",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-032",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-038",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-027",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-030",
      "suggestions": [],
      "additions": []
    },
    {
      "token": "100V3-RATEQ-A-029",
      "suggestions": [
        {
          "slug": "quadratic-root-formula",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-roots: Квадрат тэгшитгэлийн язгуур"
          ]
        },
        {
          "slug": "vieta",
          "score": 0.8,
          "reasons": [
            "Сэдэв RATEQ: суурь томьёо",
            "quadratic-vieta: Язгууруудын нийлбэр ба үржвэрийг холбох Виет"
          ]
        }
      ],
      "additions": []
    }
  ]
}
```
