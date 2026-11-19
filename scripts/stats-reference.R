# Reference values for BioSketch's statistical tests, worked out in R (base and stats only).
# Run from the project folder:   Rscript scripts/stats-reference.R
# It writes tests/stats-reference.json, which tests/distributions.test.ts and
# tests/chart-tests.test.ts compare BioSketch's own arithmetic with.

A <- c(4.1, 5.3, 6.0, 5.8, 4.9, 6.4)
B <- c(6.9, 7.4, 5.9, 8.1, 7.7, 6.6)
C <- c(5.2, 9.3, 8.8, 10.1, 7.9, 9.6)
D <- c(3.3, 4.7, 5.1, 2.9)
T1 <- c(1, 2, 2, 3, 4, 4, 5)
T2 <- c(2, 3, 4, 4, 5, 6, 6, 7)
S <- c(0.8, 1.1, 1.3, 1.9, 2.4, 3.8, 7.5, 21.0)
# Paired with a tie among the changes and one row without change.
P1 <- c(10, 12, 9, 14, 11, 13, 8, 15)
P2 <- c(12, 15, 9, 13, 14, 17, 10, 19)

num <- function(v) {
  v <- unname(v)
  s <- ifelse(is.na(v), "null", sprintf("%.15g", v))
  if (length(v) == 1) s else paste0("[", paste(s, collapse = ","), "]")
}
obj <- function(...) {
  parts <- list(...)
  paste0("{", paste(sprintf("\"%s\":%s", names(parts), unlist(parts)), collapse = ","), "}")
}

htest <- function(t) obj(statistic = num(t$statistic), df = num(if (is.null(t$parameter)) NA else t$parameter), p = num(t$p.value))

# ---- distributions ----
# ptukey is left out where R's own function is approximate: beyond 25000 degrees of freedom it
# uses the value for infinitely many, and for a large range with very few degrees of freedom it
# is good to three or four digits only. tests/distributions.test.ts checks those against SciPy.
dist <- obj(
  pt2 = num(c(2 * pt(-2.3, 7.4), 2 * pt(-0.01, 3), 2 * pt(-12, 2.5), 2 * pt(-1.96, 120000), 2 * pt(-5, 1))),
  pf = num(c(pf(5.1, 2, 12, lower.tail = FALSE), pf(0.3, 4, 7.5, lower.tail = FALSE), pf(40, 1, 3, lower.tail = FALSE), pf(1.2, 23, 60000, lower.tail = FALSE))),
  pchisq = num(c(pchisq(7.2, 2, lower.tail = FALSE), pchisq(0.4, 5, lower.tail = FALSE), pchisq(60, 3, lower.tail = FALSE), pchisq(25, 23, lower.tail = FALSE))),
  pnorm = num(c(pnorm(-1.96), pnorm(0.3), pnorm(-8), pnorm(4.5), pnorm(0))),
  qnorm = num(c(qnorm(0.025), qnorm(0.5), qnorm(0.9), qnorm(1e-9), qnorm(0.31))),
  ptukey = num(c(
    ptukey(3.5, 3, 12, lower.tail = FALSE), ptukey(1.2, 4, 20, lower.tail = FALSE), ptukey(6, 5, 8, lower.tail = FALSE),
    ptukey(2.8, 2, 10, lower.tail = FALSE), ptukey(4.2, 10, 60, lower.tail = FALSE), ptukey(3, 3, 2, lower.tail = FALSE),
    ptukey(5, 24, 500, lower.tail = FALSE), ptukey(3.3, 6, 2000, lower.tail = FALSE), ptukey(9, 4, 5, lower.tail = FALSE),
    ptukey(0.4, 3, 15, lower.tail = FALSE)
  )),
  pwilcox = num(c(pwilcox(4, 6, 6), pwilcox(10, 4, 8), pwilcox(0, 3, 3), pwilcox(600, 40, 45), pwilcox(1200, 49, 49))),
  psignrank = num(c(psignrank(3, 8), psignrank(0, 5), psignrank(40, 15), psignrank(500, 49)))
)

# ---- two groups ----
# Signed-rank tests are run with digits.rank = 12: changes that are equal on paper (4.1 - 6.9 and
# 4.9 - 7.7) differ in their last binary digit, and R's default would not count them as ties.
# BioSketch rounds differences to 12 significant digits for the same reason. srABnoisy is R's
# default on the same data, kept to show the difference.
two <- obj(
  welchAB = htest(t.test(A, B)),
  welchAD = htest(t.test(A, D)),
  pairedAB = htest(t.test(A, B, paired = TRUE)),
  pairedP = htest(t.test(P1, P2, paired = TRUE)),
  mwAB = htest(wilcox.test(A, B)),
  mwAD = htest(wilcox.test(A, D)),
  mwTies = htest(suppressWarnings(wilcox.test(T1, T2))),
  mwAS = htest(wilcox.test(A, S)),
  srAB = htest(suppressWarnings(wilcox.test(A, B, paired = TRUE, digits.rank = 12))),
  srABnoisy = htest(wilcox.test(A, B, paired = TRUE)),
  srP = htest(suppressWarnings(wilcox.test(P1, P2, paired = TRUE, digits.rank = 12))),
  srAC = htest(wilcox.test(A, C, paired = TRUE, digits.rank = 12))
)

# ---- several groups, separate samples ----
y <- c(A, B, C, D)
g <- factor(rep(c("A", "B", "C", "D"), c(6, 6, 6, 4)))
fit <- aov(y ~ g)
tab <- summary(fit)[[1]]
tuk <- TukeyHSD(fit)$g
pooled <- pairwise.t.test(y, g, p.adjust.method = "none")$p.value
kw <- kruskal.test(y, g)
pw <- suppressWarnings(pairwise.wilcox.test(y, g))$p.value
pwRaw <- suppressWarnings(pairwise.wilcox.test(y, g, p.adjust.method = "none"))$p.value
# Pairs in the order A-B, A-C, A-D, B-C, B-D, C-D.
lower <- function(m) c(m["B", "A"], m["C", "A"], m["D", "A"], m["C", "B"], m["D", "B"], m["D", "C"])
several <- obj(
  anova = obj(statistic = num(tab[1, "F value"]), df = num(c(tab[1, "Df"], tab[2, "Df"])), p = num(tab[1, "Pr(>F)"])),
  tukey = num(tuk[c("B-A", "C-A", "D-A", "C-B", "D-B", "D-C"), "p adj"]),
  pooledRaw = num(lower(pooled)),
  # Each group against the first, corrected for three comparisons.
  pooledFirstHolm = num(p.adjust(lower(pooled)[1:3], "holm")),
  kruskal = htest(kw),
  wilcoxHolm = num(lower(pw)),
  wilcoxFirstHolm = num(p.adjust(lower(pwRaw)[1:3], "holm")),
  # Kruskal-Wallis with ties.
  kruskalTies = htest(kruskal.test(list(T1, T2, c(1, 1, 3, 5, 8))))
)

# ---- several groups, the same samples in every group ----
M <- cbind(A, B, C)
yy <- as.vector(M)
gg <- factor(rep(c("A", "B", "C"), each = 6))
ss <- factor(rep(1:6, 3))
rm <- anova(lm(yy ~ ss + gg))
ptt <- pairwise.t.test(yy, gg, paired = TRUE)$p.value
pww <- suppressWarnings(pairwise.wilcox.test(yy, gg, paired = TRUE, digits.rank = 12))$p.value
low3 <- function(m) c(m["B", "A"], m["C", "A"], m["C", "B"])
TM <- cbind(c(1, 2, 2, 3, 4), c(2, 2, 4, 4, 5), c(3, 2, 4, 6, 5))
repeated <- obj(
  anova = obj(statistic = num(rm["gg", "F value"]), df = num(c(rm["gg", "Df"], rm["Residuals", "Df"])), p = num(rm["gg", "Pr(>F)"])),
  pairedHolm = num(low3(ptt)),
  friedman = htest(friedman.test(M)),
  signedHolm = num(low3(pww)),
  friedmanTies = htest(friedman.test(TM))
)

# ---- does the scatter look normal? ----
resid4 <- residuals(fit)
normal <- obj(
  A = htest(shapiro.test(A)),
  S = htest(shapiro.test(S)),
  three = htest(shapiro.test(c(1.2, 3.4, 3.9))),
  T2 = htest(shapiro.test(T2)),
  residuals = htest(shapiro.test(resid4)),
  twelve = htest(shapiro.test(c(A, B))),
  large = htest(shapiro.test(qexp(ppoints(60))))
)

holm <- num(p.adjust(c(0.01, 0.04, 0.03, 0.5, 0.012), "holm"))

writeLines(obj(r = sprintf("\"%s\"", R.version.string), dist = dist, two = two, several = several, repeated = repeated, normal = normal, holm = holm), "tests/stats-reference.json")
cat("Wrote tests/stats-reference.json\n")
