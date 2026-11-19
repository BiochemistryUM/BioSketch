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

# ---- dose-response curves ----
# The four-parameter logistic along log10 of the dose: nls with the self-starting model SSfpl,
# y = A + (B - A) / (1 + exp((xmid - log10(x)) / scal)). BioSketch writes the same curve with
# hill = 1 / (scal * log(10)) and calls the higher plateau "top".
dose_fit <- function(x, y) {
  lx <- log10(x)
  f <- nls(y ~ SSfpl(lx, A, B, xmid, scal))
  co <- coef(f)
  se <- summary(f)$coefficients[, "Std. Error"]
  sse <- sum(residuals(f)^2)
  obj(x = num(x), y = num(y), A = num(co["A"]), B = num(co["B"]), xmid = num(co["xmid"]), scal = num(co["scal"]),
      seXmid = num(se["xmid"]), sse = num(sse), r2 = num(1 - sse / sum((y - mean(y))^2)), tcrit = num(qt(0.975, length(y) - 4)))
}
# A rising curve, one value per dose; a falling one (inhibition) with three values per dose; and
# a rising one with a shallow slope and plateaus that are only just reached.
doses <- c(0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100)
rise <- c(2.1, 3.4, 4.0, 11.8, 31.5, 62.0, 84.9, 93.1, 96.4)
dose3 <- rep(c(0.1, 0.3, 1, 3, 10, 30, 100, 300), each = 3)
fall <- c(101, 97, 99, 96, 99, 94, 88, 91, 85, 66, 71, 62, 38, 33, 41, 16, 19, 12, 8, 6, 9, 5, 7, 4)
shallow <- c(8.0, 12.5, 15.1, 24.9, 33.0, 45.2, 58.9, 66.8, 77.5)
dose <- obj(rise = dose_fit(doses, rise), fall = dose_fit(dose3, fall), shallow = dose_fit(doses, shallow),
            qt = num(c(qt(0.975, 1), qt(0.975, 5), qt(0.975, 20), qt(0.995, 3), qt(0.95, 200))))

# ---- two factors ----
# Two-way analysis of variance with Type II sums of squares: each factor after the other, the
# interaction after both, every F against what is left within the combinations. Worked out from
# least-squares fits (lm). With equal numbers in every combination it must equal anova(aov(y ~ A * B)),
# which is recorded beside it. Pairs: t tests with the scatter left over in the whole table, Holm.
type2 <- function(y, A, B) {
  rss <- function(m) sum(residuals(m)^2)
  full <- lm(y ~ A * B); both <- lm(y ~ A + B)
  dfe <- df.residual(full); mse <- rss(full) / dfe
  ss <- c(rss(lm(y ~ B)) - rss(both), rss(lm(y ~ A)) - rss(both), rss(both) - rss(full))
  df <- c(nlevels(A) - 1, nlevels(B) - 1, (nlevels(A) - 1) * (nlevels(B) - 1))
  f <- ss / df / mse
  list(ss = ss, df = df, f = f, p = pf(f, df, dfe, lower.tail = FALSE), dfe = dfe, mse = mse)
}
cell_pair <- function(x, y, fit) 2 * pt(-abs((mean(x) - mean(y)) / sqrt(fit$mse * (1 / length(x) + 1 / length(y)))), fit$dfe)
two_out <- function(fit, extra = list()) do.call(obj, c(list(ss = num(fit$ss), df = num(fit$df), f = num(fit$f), p = num(fit$p), dfe = num(fit$dfe), mse = num(fit$mse)), extra))
# Three categories by two series, four values each (balanced).
bal <- list(c(4.1, 3.8, 4.6, 4.3), c(6.9, 7.4, 6.1, 7.8), c(5.0, 4.7, 5.6, 5.2), c(9.4, 8.8, 10.1, 9.0), c(4.4, 4.9, 3.9, 4.6), c(5.1, 5.9, 4.8, 5.5))
balA <- factor(rep(c("c1", "c2", "c3"), each = 8)); balB <- factor(rep(rep(c("s1", "s2"), each = 4), 3))
balFit <- type2(unlist(bal), balA, balB)
balAov <- anova(aov(unlist(bal) ~ balA * balB))
balPairs <- p.adjust(c(cell_pair(bal[[1]], bal[[2]], balFit), cell_pair(bal[[3]], bal[[4]], balFit), cell_pair(bal[[5]], bal[[6]], balFit)), "holm")
balAcross <- p.adjust(c(cell_pair(bal[[1]], bal[[3]], balFit), cell_pair(bal[[1]], bal[[5]], balFit), cell_pair(bal[[3]], bal[[5]], balFit),
                        cell_pair(bal[[2]], bal[[4]], balFit), cell_pair(bal[[2]], bal[[6]], balFit), cell_pair(bal[[4]], bal[[6]], balFit)), "holm")
# Two by two with unequal numbers: A, B, D and C from the top of this file (6, 6, 4 and 6 values).
unA <- factor(c(rep("c1", 12), rep("c2", 10))); unB <- factor(c(rep("s1", 6), rep("s2", 6), rep("s1", 4), rep("s2", 6)))
unFit <- type2(c(A, B, D, C), unA, unB)
unPairs <- p.adjust(c(cell_pair(A, B, unFit), cell_pair(D, C, unFit)), "holm")
twoway <- obj(
  balanced = two_out(balFit, list(aovF = num(balAov[1:3, "F value"]), aovP = num(balAov[1:3, "Pr(>F)"]), within = num(balPairs), across = num(balAcross))),
  unequal = two_out(unFit, list(within = num(unPairs)))
)

writeLines(obj(r = sprintf("\"%s\"", R.version.string), dist = dist, two = two, several = several, repeated = repeated, normal = normal, holm = holm, dose = dose, twoway = twoway), "tests/stats-reference.json")
cat("Wrote tests/stats-reference.json\n")
